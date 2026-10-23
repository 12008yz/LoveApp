"use client";

import { useEffect, useState } from "react";
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

  async function load() {
    const res = await fetch("/api/pings");
    const json = await res.json();
    setPings(json.pings || []);
  }

  useEffect(() => {
    load();
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
        {pings.length === 0 ? <p className="muted">Пингов ещё не было — отправьте первый.</p> : null}
        {pings.map((p) => (
          <div key={p.id} className="list-item">
            <strong>{label(p.kind)}</strong>
            <div className="meta">
              {p.author.displayName} · {new Date(p.createdAt).toLocaleString("ru-RU")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
