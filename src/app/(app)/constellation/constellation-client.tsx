"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type EventItem = {
  id: string;
  title: string;
  body: string | null;
  happenedAt: string;
  author: { displayName: string };
};

function starPosition(id: string, index: number) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const left = 8 + ((hash + index * 17) % 84);
  const top = 8 + ((hash >> 8) + index * 23) % 52;
  return { left: `${left}%`, top: `${top}%` };
}

export function ConstellationClient() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/timeline");
    const json = await res.json();
    const list = (json.events || []) as EventItem[];
    setEvents(list);
    if (!activeId && list[0]) setActiveId(list[0].id);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setActiveId(json.event.id);
    }
  }

  const active = useMemo(
    () => events.find((ev) => ev.id === activeId) || events[0] || null,
    [events, activeId],
  );

  return (
    <div className="stack">
      <div className="constellation" aria-label="Созвездие">
        {events.map((ev, i) => (
          <button
            key={ev.id}
            type="button"
            className={ev.id === active?.id ? "constellation__star is-active" : "constellation__star"}
            style={starPosition(ev.id, i)}
            title={ev.title}
            aria-label={ev.title}
            onClick={() => setActiveId(ev.id)}
          />
        ))}
        <div className="constellation__detail">
          {active ? (
            <>
              <h3>{active.title}</h3>
              <p className="meta" style={{ color: "rgba(245,236,208,0.75)" }}>
                {new Date(active.happenedAt).toLocaleDateString("ru-RU")} · {active.author.displayName}
              </p>
              {active.body ? <p style={{ marginBottom: 0 }}>{active.body}</p> : null}
            </>
          ) : (
            <p style={{ margin: 0, color: "rgba(245,236,208,0.75)" }}>
              Пока пусто — добавьте первую звезду ниже.
            </p>
          )}
        </div>
      </div>

      <form className="soft-panel" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="title">Момент</label>
          <input id="title" name="title" required placeholder="Первая поездка" />
        </div>
        <div className="field">
          <label htmlFor="happenedAt">Когда</label>
          <input id="happenedAt" name="happenedAt" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="body">Почему это важно</label>
          <textarea id="body" name="body" />
        </div>
        <button className="btn btn-primary" type="submit">
          Добавить в созвездие
        </button>
      </form>
    </div>
  );
}
