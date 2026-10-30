"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";
import { canEditLetter, isActionableUnread } from "@/lib/letters";
import { usePresence } from "@/hooks/use-presence";

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
  const [overlayShown, setOverlayShown] = useState<Overlay | null>(null);
  const [phase, setPhase] = useState<EnvelopePhase>("idle");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayPresence = usePresence(Boolean(overlay));

  useEffect(() => {
    if (overlay) setOverlayShown(overlay);
  }, [overlay]);

  async function load() {
    try {
      const res = await fetch("/api/letters");
      const json = await res.json();
      setLetters(json.letters || []);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    setMounted(true);
    void load();
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!overlay) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [overlay]);

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

  const displayOverlay = overlay ?? (overlayPresence.mounted ? overlayShown : null);
  const activeLetter =
    displayOverlay && (displayOverlay.kind === "view" || displayOverlay.kind === "edit")
      ? letters.find((l) => l.id === displayOverlay.id) ?? null
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

  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) closeOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // closeOverlay closes over latest busy/overlay via render closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, busy]);

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

  function parseUnlockAt(raw: FormDataEntryValue | null) {
    const date = new Date(String(raw || ""));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  async function onCompose(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const unlockAt = parseUnlockAt(fd.get("unlockAt"));
    if (!unlockAt) return;
    setBusy(true);
    setPhase("sealing");
    // Match letter-env-send / flap-close timing in CSS (~1.35s).
    await new Promise((r) => setTimeout(r, 1400));
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
    const unlockAt = parseUnlockAt(fd.get("unlockAt"));
    if (!unlockAt) return;
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
        {!ready ? <ListSkeleton rows={4} tall /> : null}
        {ready && shown.length === 0 ? (
          <p className="muted">
            {tab === "inbox" ? "Входящих писем нет." : "Пока пусто — напишите первое."}
          </p>
        ) : null}
        {ready
          ? shown.map((letter, i) => (
          <button
            key={letter.id}
            type="button"
            className={`letter-envelope-card list-enter${letter.locked ? " is-locked" : ""}${
              !letter.openedAt && letter.authorId !== me && !letter.locked ? " is-new" : ""
            }`}
            style={listEnterStyle(i)}
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
            ))
          : null}
      </div>

      {mounted && overlayPresence.mounted && displayOverlay
        ? createPortal(
            <div
              className={overlayPresence.visible ? "letter-overlay is-open" : "letter-overlay"}
              role="dialog"
              aria-modal="true"
              aria-label="Письмо"
            >
              <button
                type="button"
                className="letter-overlay__backdrop"
                aria-label="Закрыть"
                onClick={closeOverlay}
                disabled={busy}
              />
              <div className={`letter-overlay__stage is-${phase}`}>
                <div
                  className="letter-env"
                  aria-hidden={phase === "open" && displayOverlay.kind !== "view"}
                >
                  <div className="letter-env__back" />
                  <div className="letter-env__paper" />
                  <div className="letter-env__front" />
                  <div className="letter-env__flap" />
                </div>

                {displayOverlay.kind === "compose" || displayOverlay.kind === "edit" ? (
                  <form
                    className="letter-sheet"
                    onSubmit={displayOverlay.kind === "compose" ? onCompose : onEdit}
                  >
                    <div className="field">
                      <label htmlFor="letter-title">Заголовок</label>
                      <input
                        id="letter-title"
                        name="title"
                        required
                        maxLength={120}
                        defaultValue={
                          displayOverlay.kind === "edit" ? activeLetter?.title : undefined
                        }
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="letter-body">Текст</label>
                      <textarea
                        id="letter-body"
                        name="body"
                        required
                        rows={5}
                        maxLength={10000}
                        defaultValue={
                          displayOverlay.kind === "edit" ? activeLetter?.body : undefined
                        }
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
                          displayOverlay.kind === "edit" && activeLetter
                            ? toLocalInput(activeLetter.unlockAt)
                            : undefined
                        }
                      />
                    </div>
                    <div className="letter-sheet__actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={closeOverlay}
                        disabled={busy}
                      >
                        Отмена
                      </button>
                      <button type="submit" className="btn btn-primary" disabled={busy}>
                        {displayOverlay.kind === "compose" ? "Запечатать" : "Сохранить"}
                      </button>
                    </div>
                  </form>
                ) : null}

                {displayOverlay.kind === "view" && activeLetter ? (
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
