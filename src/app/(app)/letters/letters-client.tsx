"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { canEditLetter, isActionableUnread } from "@/lib/letters";

type Letter = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  unlockAt: string;
  locked: boolean;
  canRead: boolean;
  openedAt: string | null;
  author: { displayName: string };
};

type Tab = "inbox" | "sent";

type Overlay =
  | { kind: "compose" }
  | { kind: "view"; id: string }
  | { kind: "edit"; id: string };

type EnvelopePhase = "idle" | "opening" | "open" | "sealing";

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusLabel(letter: Letter, me: string | undefined) {
  if (letter.locked) return "Закрыто";
  if (!letter.openedAt && letter.authorId !== me) return "Можно открыть";
  if (letter.openedAt) return "Прочитано";
  if (letter.authorId === me) return "Отправлено";
  return "";
}

export function LettersClient() {
  const { data } = useSession();
  const me = data?.user?.id;
  const [letters, setLetters] = useState<Letter[]>([]);
  const [tab, setTab] = useState<Tab>("inbox");
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [phase, setPhase] = useState<EnvelopePhase>("idle");
  const [busy, setBusy] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const res = await fetch("/api/letters");
    const json = await res.json();
    setLetters(json.letters || []);
  }

  useEffect(() => {
    void load();
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    };
  }, []);

  const inbox = useMemo(
    () => (me ? letters.filter((l) => l.authorId !== me) : []),
    [letters, me],
  );
  const sent = useMemo(
    () => (me ? letters.filter((l) => l.authorId === me) : []),
    [letters, me],
  );
  const shown = tab === "inbox" ? inbox : sent;
  const actionable = useMemo(
    () => (me ? letters.filter((l) => isActionableUnread(l, me)) : []),
    [letters, me],
  );

  const activeLetter =
    overlay && (overlay.kind === "view" || overlay.kind === "edit")
      ? letters.find((l) => l.id === overlay.id) ?? null
      : null;

  function clearOpenTimer() {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }

  function closeOverlay() {
    clearOpenTimer();
    setOverlay(null);
    setPhase("idle");
    setBusy(false);
  }

  function openCompose() {
    clearOpenTimer();
    setOverlay({ kind: "compose" });
    setPhase("open");
  }

  function openEnvelope(letter: Letter) {
    clearOpenTimer();
    setOverlay({ kind: "view", id: letter.id });
    // Locked for partner: show sheet with “still closed” (idle would hide the sheet).
    if (!letter.canRead) {
      setPhase("open");
      return;
    }
    if (letter.authorId === me || letter.openedAt) {
      setPhase("open");
      return;
    }
    setPhase("idle");
    requestAnimationFrame(() => {
      setPhase("opening");
      openTimer.current = setTimeout(() => {
        setPhase("open");
        if (!letter.openedAt && letter.authorId !== me && !letter.locked) {
          void markOpened(letter.id);
        }
        openTimer.current = null;
      }, 1100);
    });
  }

  async function markOpened(id: string) {
    await fetch(`/api/letters/${id}/open`, { method: "POST" });
    await load();
  }

  async function onCompose(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const unlockAt = new Date(String(fd.get("unlockAt"))).toISOString();
    setBusy(true);
    setPhase("sealing");
    await new Promise((r) => setTimeout(r, 1000));
    const res = await fetch("/api/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        body: fd.get("body"),
        unlockAt,
      }),
    });
    setBusy(false);
    if (res.ok) {
      form.reset();
      await load();
      closeOverlay();
    } else {
      setPhase("open");
    }
  }

  async function onEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeLetter || busy) return;
    const fd = new FormData(e.currentTarget);
    const unlockAt = new Date(String(fd.get("unlockAt"))).toISOString();
    setBusy(true);
    const res = await fetch(`/api/letters/${activeLetter.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        body: fd.get("body"),
        unlockAt,
      }),
    });
    setBusy(false);
    if (res.ok) {
      await load();
      setOverlay({ kind: "view", id: activeLetter.id });
      setPhase("open");
    }
  }

  const editable = activeLetter && me ? canEditLetter(activeLetter, me) : false;

  return (
    <div className="letters">
      <div className="letters__toolbar">
        <p className="letters__status meta">
          {actionable.length > 0
            ? `Можно открыть: ${actionable.length}`
            : inbox.some((l) => l.locked)
              ? "Есть письма, которые ещё закрыты"
              : "Новых писем нет"}
        </p>
        <button type="button" className="btn btn-primary" onClick={openCompose}>
          Написать
        </button>
      </div>

      <div className="letter-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={tab === "inbox" ? "is-active" : undefined}
          aria-selected={tab === "inbox"}
          onClick={() => setTab("inbox")}
        >
          Входящие ({inbox.length})
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "sent" ? "is-active" : undefined}
          aria-selected={tab === "sent"}
          onClick={() => setTab("sent")}
        >
          Отправленные ({sent.length})
        </button>
      </div>

      <div className="letters__list">
        {shown.length === 0 ? (
          <p className="muted">
            {tab === "inbox" ? "Входящих писем нет." : "Пока пусто — напишите первое."}
          </p>
        ) : null}
        {shown.map((letter) => (
          <button
            key={letter.id}
            type="button"
            className={`letter-envelope-card${letter.locked ? " is-locked" : ""}${
              !letter.openedAt && letter.authorId !== me && !letter.locked ? " is-new" : ""
            }`}
            onClick={() => openEnvelope(letter)}
          >
            <span className="letter-envelope-card__flap" aria-hidden />
            <span className="letter-envelope-card__body">
              <strong>{letter.title}</strong>
              <span className="meta">
                {letter.authorId === me ? "Вы" : letter.author.displayName}
                {" · "}
                {new Date(letter.unlockAt).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="letter-envelope-card__badge">{statusLabel(letter, me)}</span>
            </span>
          </button>
        ))}
      </div>

      {overlay ? (
        <div className="letter-overlay" role="dialog" aria-modal="true" aria-label="Письмо">
          <button
            type="button"
            className="letter-overlay__backdrop"
            aria-label="Закрыть"
            onClick={closeOverlay}
            disabled={busy}
          />
          <div className={`letter-overlay__stage is-${phase}`}>
            <div className="letter-env" aria-hidden={overlay.kind === "compose" && phase === "open"}>
              <div className="letter-env__pocket" />
              <div className="letter-env__flap" />
            </div>

            {overlay.kind === "compose" || overlay.kind === "edit" ? (
              <form
                className="letter-sheet"
                onSubmit={overlay.kind === "compose" ? onCompose : onEdit}
              >
                <div className="field">
                  <label htmlFor="letter-title">Заголовок</label>
                  <input
                    id="letter-title"
                    name="title"
                    required
                    maxLength={120}
                    defaultValue={overlay.kind === "edit" ? activeLetter?.title : undefined}
                  />
                </div>
                <div className="field">
                  <label htmlFor="letter-body">Текст</label>
                  <textarea
                    id="letter-body"
                    name="body"
                    required
                    rows={6}
                    maxLength={10000}
                    defaultValue={overlay.kind === "edit" ? activeLetter?.body : undefined}
                  />
                </div>
                <div className="field">
                  <label htmlFor="letter-unlock">Открыть после</label>
                  <input
                    id="letter-unlock"
                    name="unlockAt"
                    type="datetime-local"
                    required
                    defaultValue={
                      overlay.kind === "edit" && activeLetter
                        ? toLocalInput(activeLetter.unlockAt)
                        : undefined
                    }
                  />
                </div>
                <div className="letter-sheet__actions">
                  <button type="button" className="btn btn-secondary" onClick={closeOverlay} disabled={busy}>
                    Отмена
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {overlay.kind === "compose" ? "Запечатать" : "Сохранить"}
                  </button>
                </div>
              </form>
            ) : null}

            {overlay.kind === "view" && activeLetter ? (
              <div className="letter-sheet">
                {!activeLetter.canRead ? (
                  <>
                    <h3 className="letter-sheet__title">{activeLetter.title}</h3>
                    <p className="muted">
                      Ещё закрыто до{" "}
                      {new Date(activeLetter.unlockAt).toLocaleString("ru-RU")}
                    </p>
                    <button type="button" className="btn btn-secondary" onClick={closeOverlay}>
                      Закрыть
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="letter-sheet__title">{activeLetter.title}</h3>
                    <p className="meta" style={{ marginTop: 0 }}>
                      {activeLetter.author.displayName}
                      {" · "}
                      {new Date(activeLetter.unlockAt).toLocaleString("ru-RU")}
                    </p>
                    <p className="letter-sheet__body">{activeLetter.body}</p>
                    <div className="letter-sheet__actions">
                      {editable ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setOverlay({ kind: "edit", id: activeLetter.id });
                            setPhase("open");
                          }}
                        >
                          Изменить
                        </button>
                      ) : null}
                      <button type="button" className="btn btn-primary" onClick={closeOverlay}>
                        Закрыть
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
