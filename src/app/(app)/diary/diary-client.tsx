"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";
import { usePresence } from "@/hooks/use-presence";

type Entry = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: { id: string; displayName: string; genderRole?: string };
};

type DayGroup = {
  key: string;
  label: string;
  entries: Entry[];
};

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function formatDayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startMsg.getTime()) / 86_400_000);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Вчера";
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDay(entries: Entry[]): DayGroup[] {
  const newestFirst = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const map = new Map<string, DayGroup>();
  for (const entry of newestFirst) {
    const key = dayKey(entry.createdAt);
    let group = map.get(key);
    if (!group) {
      group = { key, label: formatDayLabel(entry.createdAt), entries: [] };
      map.set(key, group);
    }
    group.entries.push(entry);
  }
  return [...map.values()];
}

function previewText(body: string) {
  const cleaned = body.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 140) return cleaned;
  return `${cleaned.slice(0, 137).trimEnd()}…`;
}

function BackChevron() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OpenChevron() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
      <path
        d="M9.5 5.5 16 12l-6.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DiaryClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetEntry, setSheetEntry] = useState<Entry | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const days = useMemo(() => groupByDay(entries), [entries]);
  const selected = useMemo(
    () => (selectedId ? entries.find((e) => e.id === selectedId) ?? null : null),
    [entries, selectedId],
  );
  const sheetOpen = Boolean(selectedId && selected);
  const sheetPresence = usePresence(sheetOpen && portalReady);
  const shownEntry = selected ?? (sheetPresence.mounted ? sheetEntry : null);

  async function load() {
    try {
      const res = await fetch("/api/diary");
      const json = await res.json();
      setEntries(json.entries || []);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selected) setSheetEntry(selected);
  }, [selected]);

  useEffect(() => {
    if (!selectedId) return;
    if (!entries.some((e) => e.id === selectedId)) setSelectedId(null);
  }, [entries, selectedId]);

  function closeSheet() {
    setSelectedId(null);
    setError("");
  }

  useEffect(() => {
    if (!sheetPresence.mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setError("");
      }
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetPresence.mounted]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          body: fd.get("body"),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Ошибка");
        return;
      }
      if (!json.entry?.id) {
        setError("Не удалось сохранить");
        return;
      }
      form.reset();
      setComposeOpen(false);
      setEntries((prev) => [...prev, json.entry]);
      setSelectedId(json.entry.id);
    } catch {
      setError("Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (deleting) return;
    if (!confirm("Удалить эту запись?")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/diary/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Не удалось удалить");
        return;
      }
      setError("");
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
    } catch {
      setError("Не удалось удалить");
    } finally {
      setDeleting(false);
    }
  }

  const shownRole = shownEntry?.author.genderRole === "girl" ? "girl" : "boy";

  return (
    <div className="diary">
      <div className="diary__toolbar">
        {!composeOpen ? (
          <button
            type="button"
            className="diary__new"
            onClick={() => {
              setComposeOpen(true);
              setError("");
            }}
          >
            Новая запись
          </button>
        ) : null}
      </div>

      {composeOpen ? (
        <form className="diary-compose" onSubmit={onSubmit}>
          <p className="diary-compose__eyebrow">Новый лист</p>
          {error ? <p className="error-text">{error}</p> : null}
          <div className="field">
            <label htmlFor="title">Тема</label>
            <input
              id="title"
              name="title"
              required
              maxLength={120}
              placeholder="Коротко о дне…"
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="body">Запись</label>
            <textarea
              id="body"
              name="body"
              required
              rows={6}
              placeholder="Что хочется сохранить…"
            />
          </div>
          <div className="diary-compose__actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setComposeOpen(false);
                setError("");
              }}
              disabled={busy}
            >
              Отмена
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Сохраняем…" : "Сохранить"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="diary-journal">
        {!ready ? <ListSkeleton rows={4} tall /> : null}
        {ready && entries.length === 0 && !composeOpen ? (
          <p className="diary-empty">Пока пусто — откройте новый лист и напишите первое.</p>
        ) : null}

        {ready
          ? days.map((day) => (
              <section key={day.key} className="diary-day">
                <h2 className="diary-day__label">{day.label}</h2>
                <div className="diary-day__list">
                  {day.entries.map((entry, ei) => {
                    const role = entry.author.genderRole === "girl" ? "girl" : "boy";
                    const preview = previewText(entry.body);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        className={
                          role === "girl"
                            ? "diary-leaf diary-leaf--girl list-enter"
                            : "diary-leaf diary-leaf--boy list-enter"
                        }
                        style={listEnterStyle(ei)}
                        aria-label={`Открыть запись: ${entry.title}`}
                        onClick={() => {
                          setError("");
                          setSelectedId(entry.id);
                        }}
                      >
                        <span className="diary-leaf__main">
                          <span className="diary-leaf__title">{entry.title}</span>
                          <span className="diary-leaf__meta">
                            <span className="diary-leaf__author">{entry.author.displayName}</span>
                            <span aria-hidden>·</span>
                            <span>{formatTime(entry.createdAt)}</span>
                          </span>
                          {preview ? <span className="diary-leaf__preview">{preview}</span> : null}
                        </span>
                        <span className="diary-leaf__chevron" aria-hidden>
                          <OpenChevron />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          : null}
      </div>

      {sheetPresence.mounted && shownEntry
        ? createPortal(
            <div
              className={sheetPresence.visible ? "diary-sheet is-open" : "diary-sheet"}
              role="dialog"
              aria-modal="true"
              aria-label={shownEntry.title}
            >
              <button
                type="button"
                className="diary-sheet__backdrop"
                aria-label="Закрыть"
                onClick={closeSheet}
              />
              <div
                className={
                  shownRole === "girl"
                    ? "diary-sheet__panel diary-sheet__panel--girl"
                    : "diary-sheet__panel diary-sheet__panel--boy"
                }
              >
                <div className="diary-sheet__top">
                  <button
                    type="button"
                    className="diary-sheet__back"
                    aria-label="Назад"
                    onClick={closeSheet}
                  >
                    <BackChevron />
                  </button>
                  <p className="diary-sheet__eyebrow">Запись</p>
                </div>

                <header className="diary-sheet__head">
                  <h2 className="diary-sheet__title">{shownEntry.title}</h2>
                  <p className="diary-sheet__meta">
                    <span className="diary-sheet__author">{shownEntry.author.displayName}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={shownEntry.createdAt}>
                      {formatDayLabel(shownEntry.createdAt)} · {formatTime(shownEntry.createdAt)}
                    </time>
                  </p>
                </header>

                <p className="diary-sheet__body">{shownEntry.body}</p>

                {error ? <p className="error-text">{error}</p> : null}

                <button
                  type="button"
                  className="diary-sheet__delete"
                  disabled={deleting}
                  onClick={() => void remove(shownEntry.id)}
                >
                  {deleting ? "Удаляем…" : "Удалить"}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
