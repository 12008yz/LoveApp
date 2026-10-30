"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";

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

export function DiaryClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const days = useMemo(() => groupByDay(entries), [entries]);

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
    void load();
  }, []);

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
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Ошибка");
        return;
      }
      form.reset();
      setComposeOpen(false);
      setEntries((prev) => [...prev, json.entry]);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Удалить эту запись?")) return;
    await fetch(`/api/diary/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

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
                return (
                  <article
                    key={entry.id}
                    className={
                      role === "girl"
                        ? "diary-leaf diary-leaf--girl list-enter"
                        : "diary-leaf diary-leaf--boy list-enter"
                    }
                    style={listEnterStyle(ei)}
                  >
                    <header className="diary-leaf__head">
                      <h3 className="diary-leaf__title">{entry.title}</h3>
                      <p className="diary-leaf__meta">
                        <span className="diary-leaf__author">{entry.author.displayName}</span>
                        <span aria-hidden>·</span>
                        <time dateTime={entry.createdAt}>
                          {new Date(entry.createdAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </p>
                    </header>
                    <p className="diary-leaf__body">{entry.body}</p>
                    <button
                      type="button"
                      className="diary-leaf__delete"
                      onClick={() => void remove(entry.id)}
                    >
                      Удалить
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
            ))
          : null}
      </div>
    </div>
  );
}
