"use client";

import { FormEvent, useEffect, useState } from "react";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";

type EventItem = {
  id: string;
  title: string;
  notes: string | null;
  occursAt: string;
  remindAt: string | null;
  author: { displayName: string };
};

export function CalendarClient() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [ready, setReady] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/events");
      const json = await res.json();
      setEvents(json.events || []);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const occursAt = new Date(String(fd.get("occursAt"))).toISOString();
    const remindRaw = String(fd.get("remindAt") || "");
    const remindAt = remindRaw ? new Date(remindRaw).toISOString() : null;
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        notes: fd.get("notes") || undefined,
        occursAt,
        remindAt,
      }),
    });
    const json = await res.json();
    if (json.event) {
      form.reset();
      setEvents((prev) =>
        [...prev, json.event].sort((a, b) => +new Date(a.occursAt) - +new Date(b.occursAt)),
      );
    }
  }

  async function remove(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="stack">
      <form className="soft-panel" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="title">Событие</label>
          <input id="title" name="title" required />
        </div>
        <div className="field">
          <label htmlFor="occursAt">Когда</label>
          <input id="occursAt" name="occursAt" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="remindAt">Напомнить (push)</label>
          <input id="remindAt" name="remindAt" type="datetime-local" />
        </div>
        <div className="field">
          <label htmlFor="notes">Заметка</label>
          <textarea id="notes" name="notes" />
        </div>
        <button className="btn btn-primary" type="submit">
          Добавить
        </button>
      </form>
      <div className="soft-panel">
        {!ready ? <ListSkeleton rows={3} /> : null}
        {ready && events.length === 0 ? (
          <p className="muted">Пока нет дат — добавьте первую.</p>
        ) : null}
        {ready
          ? events.map((ev, i) => (
          <div key={ev.id} className="list-item list-enter" style={listEnterStyle(i)}>
            <strong>{ev.title}</strong>
            <div className="meta">
              {new Date(ev.occursAt).toLocaleString("ru-RU")} · {ev.author.displayName}
            </div>
            {ev.remindAt ? (
              <div className="meta">Напоминание: {new Date(ev.remindAt).toLocaleString("ru-RU")}</div>
            ) : null}
            {ev.notes ? <p>{ev.notes}</p> : null}
            <button type="button" className="ghost-btn" onClick={() => remove(ev.id)}>
              Удалить
            </button>
          </div>
            ))
          : null}
      </div>
    </div>
  );
}
