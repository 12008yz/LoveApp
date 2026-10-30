"use client";

import { FormEvent, useEffect, useState } from "react";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";

type Item = {
  id: string;
  kind: string;
  body: string;
  visibility: string;
  author: { displayName: string; id: string };
};

export function CareClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/care");
      const json = await res.json();
      setItems(json.items || []);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/care", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: fd.get("kind"),
        body: fd.get("body"),
        visibility: fd.get("visibility"),
      }),
    });
    const json = await res.json();
    if (json.item) {
      e.currentTarget.reset();
      setItems((prev) => [json.item, ...prev]);
    }
  }

  const joys = items.filter((i) => i.kind === "joy");
  const annoyances = items.filter((i) => i.kind === "annoyance");

  return (
    <div className="stack">
      <form className="soft-panel" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="kind">Тип</label>
          <select id="kind" name="kind" defaultValue="joy">
            <option value="joy">Радует</option>
            <option value="annoyance">Бесит</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="body">Текст</label>
          <textarea id="body" name="body" required />
        </div>
        <div className="field">
          <label htmlFor="visibility">Видимость</label>
          <select id="visibility" name="visibility" defaultValue="private">
            <option value="private">Только я</option>
            <option value="shared">Мы оба</option>
          </select>
        </div>
        <button className="btn btn-primary" type="submit">
          Сохранить
        </button>
      </form>
      <div className="grid-2">
        <div className="soft-panel">
          <h3 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Радует</h3>
          {!ready ? <ListSkeleton rows={2} /> : null}
          {ready
            ? joys.map((i, idx) => (
            <div key={i.id} className="list-item list-enter" style={listEnterStyle(idx)}>
              <div>{i.body}</div>
              <div className="meta">
                {i.author.displayName} · {i.visibility === "private" ? "личное" : "общее"}
              </div>
            </div>
              ))
            : null}
        </div>
        <div className="soft-panel">
          <h3 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Бесит</h3>
          {!ready ? <ListSkeleton rows={2} /> : null}
          {ready
            ? annoyances.map((i, idx) => (
            <div key={i.id} className="list-item list-enter" style={listEnterStyle(idx)}>
              <div>{i.body}</div>
              <div className="meta">
                {i.author.displayName} · {i.visibility === "private" ? "личное" : "общее"}
              </div>
            </div>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}
