"use client";

import { FormEvent, useEffect, useState } from "react";

type Letter = {
  id: string;
  title: string;
  body: string;
  unlockAt: string;
  locked: boolean;
  canRead: boolean;
  openedAt: string | null;
  author: { displayName: string };
};

export function LettersClient() {
  const [letters, setLetters] = useState<Letter[]>([]);

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

  return (
    <div className="stack">
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
      <div className="soft-panel">
        {letters.length === 0 ? (
          <p className="muted">Пока нет писем — напишите первое на потом.</p>
        ) : null}
        {letters.map((letter) => (
          <article key={letter.id} className="list-item">
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)" }}>{letter.title}</h3>
            <p className="meta">
              {letter.author.displayName} ·{" "}
              {letter.locked
                ? `откроется ${new Date(letter.unlockAt).toLocaleString("ru-RU")}`
                : `открыто с ${new Date(letter.unlockAt).toLocaleString("ru-RU")}`}
            </p>
            {letter.canRead ? (
              <>
                {letter.locked ? (
                  <p className="meta">Для партнёра ещё закрыто — вы видите свой текст.</p>
                ) : null}
                <p style={{ whiteSpace: "pre-wrap" }}>{letter.body}</p>
                {!letter.locked && !letter.openedAt ? (
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
