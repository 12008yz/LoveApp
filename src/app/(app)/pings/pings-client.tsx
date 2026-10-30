"use client";

import { useEffect, useState } from "react";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";
import { MOOD_PINGS } from "@/lib/constants";

type Ping = {
  id: string;
  kind: string;
  note: string | null;
  createdAt: string;
  author: { displayName: string };
};

export function PingsClient() {
  const [pings, setPings] = useState<Ping[]>([]);
  const [ready, setReady] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/pings");
      const json = await res.json();
      setPings(json.pings || []);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function send(kind: string) {
    const res = await fetch("/api/pings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const json = await res.json();
    if (json.ping) setPings((prev) => [json.ping, ...prev]);
  }

  const label = (kind: string) => MOOD_PINGS.find((p) => p.kind === kind)?.label || kind;

  return (
    <div className="stack">
      <div className="ping-grid">
        {MOOD_PINGS.map((p) => (
          <button key={p.kind} type="button" className="ping-btn" onClick={() => send(p.kind)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="soft-panel">
        {!ready ? <ListSkeleton rows={3} /> : null}
        {ready && pings.length === 0 ? (
          <p className="muted">Сигналов ещё не было — отправьте первый.</p>
        ) : null}
        {ready
          ? pings.map((p, i) => (
          <div key={p.id} className="list-item list-enter" style={listEnterStyle(i)}>
            <strong>{label(p.kind)}</strong>
            <div className="meta">
              {p.author.displayName} · {new Date(p.createdAt).toLocaleString("ru-RU")}
            </div>
          </div>
            ))
          : null}
      </div>
    </div>
  );
}
