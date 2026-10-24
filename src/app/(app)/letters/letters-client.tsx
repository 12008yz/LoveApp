"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { isActionableUnread, isInboxUnread } from "@/lib/letters";

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

type Tab = "unread" | "read";

export function LettersClient() {
  const { data } = useSession();
  const me = data?.user?.id;
  const [letters, setLetters] = useState<Letter[]>([]);
  const [tab, setTab] = useState<Tab>("unread");

  async function load() {
    const res = await fetch("/api/letters");
    const json = await res.json();
    setLetters(json.letters || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const unlockAt = new Date(String(fd.get("unlockAt"))).toISOString();
    const res = await fetch("/api/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        body: fd.get("body"),
        unlockAt,
      }),
    });
    if (res.ok) {
      form.reset();
      await load();
    }
  }

  async function openLetter(id: string) {
    await fetch(`/api/letters/${id}/open`, { method: "POST" });
    await load();
  }

  // Partner letters not yet opened (including still locked). Own letters live in «Прочитанные».
  const unread = useMemo(
    () => (me ? letters.filter((l) => isInboxUnread(l, me)) : []),
    [letters, me],
  );

  const read = useMemo(
    () =>
      letters.filter((l) => {
        if (!me) return false;
        if (l.authorId === me) return true;
        return Boolean(l.openedAt);
      }),
    [letters, me],
  );

  const actionableUnread = useMemo(
    () => (me ? letters.filter((l) => isActionableUnread(l, me)) : []),
    [letters, me],
  );

  const shown = tab === "unread" ? unread : read;

  return (
    <div className="stack">
      <div className="soft-panel" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <span className="letters-heading-badge" aria-hidden>
          <span style={{ fontSize: "1.35rem" }}>✉️</span>
          {actionableUnread.length > 0 ? <span className="dot" /> : null}
        </span>
        <div>
          <strong style={{ fontFamily: "var(--font-display)" }}>Ваши письма</strong>
          <p className="meta" style={{ margin: 0 }}>
            {actionableUnread.length > 0
              ? `Можно открыть: ${actionableUnread.length}`
              : unread.length > 0
                ? "Есть письма, которые ещё не открылись по времени"
                : "Новых писем нет"}
          </p>
        </div>
      </div>

      <form className="soft-panel" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="title">Заголовок</label>
          <input id="title" name="title" required />
        </div>
        <div className="field">
          <label htmlFor="body">Текст</label>
          <textarea id="body" name="body" required />
        </div>
        <div className="field">
          <label htmlFor="unlockAt">Открыть после</label>
          <input id="unlockAt" name="unlockAt" type="datetime-local" required />
        </div>
        <button className="btn btn-primary" type="submit">
          Запечатать
        </button>
      </form>

      <div className="letter-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={tab === "unread" ? "is-active" : undefined}
          aria-selected={tab === "unread"}
          onClick={() => setTab("unread")}
        >
          Непрочитанные ({unread.length})
        </button>
        <button
          type="button"
          role="tab"
          className={tab === "read" ? "is-active" : undefined}
          aria-selected={tab === "read"}
          onClick={() => setTab("read")}
        >
          Прочитанные ({read.length})
        </button>
      </div>

      <div>
        {shown.length === 0 ? (
          <p className="muted">
            {tab === "unread" ? "Непрочитанных писем нет." : "Пока пусто — напишите первое."}
          </p>
        ) : null}
        {shown.map((letter) => (
          <article key={letter.id} className="letter-paper">
            <h3 style={{ margin: "0 0 0.35rem", fontFamily: "var(--font-display)" }}>
              {letter.title}
            </h3>
            <p className="meta">
              {letter.author.displayName} ·{" "}
              {letter.locked
                ? `откроется ${new Date(letter.unlockAt).toLocaleString("ru-RU")}`
                : `с ${new Date(letter.unlockAt).toLocaleString("ru-RU")}`}
            </p>
            {letter.canRead ? (
              <>
                {letter.locked ? (
                  <p className="meta">Для партнёра ещё закрыто — вы видите свой текст.</p>
                ) : null}
                <p style={{ whiteSpace: "pre-wrap", marginBottom: "0.75rem" }}>{letter.body}</p>
                {!letter.locked && !letter.openedAt && letter.authorId !== me ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => openLetter(letter.id)}
                  >
                    Отметить прочитанным
                  </button>
                ) : null}
              </>
            ) : (
              <p className="muted">Ещё закрыто</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
