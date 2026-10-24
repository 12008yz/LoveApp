"use client";

import { FormEvent, useEffect, useState } from "react";

type Entry = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  author: { id: string; displayName: string; genderRole?: string };
};

export function DiaryClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/diary");
    const json = await res.json();
    setEntries(json.entries || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
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
    e.currentTarget.reset();
    setEntries((prev) => [...prev, json.entry]);
  }

  async function remove(id: string) {
    await fetch(`/api/diary/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="stack">
      <form className="soft-panel" onSubmit={onSubmit}>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="field">
          <label htmlFor="title">Тема (коротко)</label>
          <input id="title" name="title" required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="body">Сообщение в дневник</label>
          <textarea id="body" name="body" required />
        </div>
        <button className="btn btn-primary" type="submit">
          Отправить
        </button>
      </form>
      <div className="diary-thread">
        {entries.length === 0 ? (
          <p className="muted">Пока пусто — напишите первое сообщение.</p>
        ) : null}
        {entries.map((entry) => {
          const role = entry.author.genderRole === "girl" ? "girl" : "boy";
          return (
            <article
              key={entry.id}
              className={role === "girl" ? "diary-bubble diary-bubble--girl" : "diary-bubble diary-bubble--boy"}
            >
              <p className="diary-bubble__title">{entry.title}</p>
              <p className="meta" style={{ marginTop: 0 }}>
                {entry.author.displayName} · {new Date(entry.createdAt).toLocaleString("ru-RU")}
              </p>
              <p style={{ whiteSpace: "pre-wrap", marginBottom: "0.5rem" }}>{entry.body}</p>
              <button type="button" className="ghost-btn" onClick={() => remove(entry.id)}>
                Удалить
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
