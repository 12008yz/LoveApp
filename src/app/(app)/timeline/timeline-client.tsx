"use client";

import { FormEvent, useEffect, useState } from "react";

type EventItem = {
  id: string;
  title: string;
  body: string | null;
  happenedAt: string;
  author: { displayName: string };
};

export function TimelineClient() {
  const [events, setEvents] = useState<EventItem[]>([]);

  async function load() {
    const res = await fetch("/api/timeline");
    const json = await res.json();
    setEvents(json.events || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const happenedAt = new Date(String(fd.get("happenedAt"))).toISOString();
    const res = await fetch("/api/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        body: fd.get("body") || undefined,
        happenedAt,
      }),
    });
    const json = await res.json();
    if (json.event) {
      e.currentTarget.reset();
      setEvents((prev) => [json.event, ...prev]);
    }
  }

  return (
    <div className="stack">
      <form className="soft-panel" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="title">Веха</label>
          <input id="title" name="title" required />
        </div>
        <div className="field">
          <label htmlFor="happenedAt">Дата</label>
          <input id="happenedAt" name="happenedAt" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="body">Описание</label>
          <textarea id="body" name="body" />
        </div>
        <button className="btn btn-primary" type="submit">
          Добавить
        </button>
      </form>
      <div className="soft-panel">
        {events.map((ev) => (
          <article key={ev.id} className="list-item">
            <h3 style={{ margin: 0, fontFamily: "var(--font-display)" }}>{ev.title}</h3>
            <p className="meta">
              {new Date(ev.happenedAt).toLocaleDateString("ru-RU")} · {ev.author.displayName}
            </p>
            {ev.body ? <p>{ev.body}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
