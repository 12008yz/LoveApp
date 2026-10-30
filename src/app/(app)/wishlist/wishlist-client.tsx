"use client";

import { FormEvent, useEffect, useState } from "react";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";

type Item = {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  forPartner: boolean;
  fulfilled: boolean;
  author: { displayName: string };
};

export function WishlistClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/wishlist");
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
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        url: fd.get("url") || "",
        notes: fd.get("notes") || undefined,
        forPartner: fd.get("forPartner") === "on",
      }),
    });
    const json = await res.json();
    if (json.item) {
      e.currentTarget.reset();
      setItems((prev) => [json.item, ...prev]);
    }
  }

  async function toggle(id: string, fulfilled: boolean) {
    const res = await fetch(`/api/wishlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fulfilled }),
    });
    const json = await res.json();
    if (json.item) {
      setItems((prev) => prev.map((i) => (i.id === id ? json.item : i)));
    }
  }

  async function remove(id: string) {
    await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="stack">
      <form className="soft-panel" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="title">Желание</label>
          <input id="title" name="title" required />
        </div>
        <div className="field">
          <label htmlFor="url">Ссылка</label>
          <input id="url" name="url" type="url" placeholder="https://" />
        </div>
        <div className="field">
          <label htmlFor="notes">Заметка</label>
          <textarea id="notes" name="notes" />
        </div>
        <label style={{ display: "flex", gap: "0.5rem", marginBottom: "0.8rem" }}>
          <input type="checkbox" name="forPartner" defaultChecked />
          Хочу, чтобы партнёр это увидел как идею подарка
        </label>
        <button className="btn btn-primary" type="submit">
          Добавить
        </button>
      </form>
      <div className="soft-panel">
        {!ready ? <ListSkeleton rows={3} /> : null}
        {ready && items.length === 0 ? <p className="muted">Список желаний пуст.</p> : null}
        {ready
          ? items.map((item, i) => (
          <div key={item.id} className="list-item list-enter" style={listEnterStyle(i)}>
            <strong style={{ textDecoration: item.fulfilled ? "line-through" : "none" }}>{item.title}</strong>
            <div className="meta">{item.author.displayName}</div>
            {item.url ? (
              <a href={item.url} target="_blank" rel="noreferrer">
                Открыть ссылку
              </a>
            ) : null}
            {item.notes ? <p>{item.notes}</p> : null}
            <div className="cta-row" style={{ justifyContent: "flex-start", marginTop: "0.5rem" }}>
              <button type="button" className="ghost-btn" onClick={() => toggle(item.id, !item.fulfilled)}>
                {item.fulfilled ? "Вернуть" : "Исполнено"}
              </button>
              <button type="button" className="ghost-btn" onClick={() => remove(item.id)}>
                Удалить
              </button>
            </div>
          </div>
            ))
          : null}
      </div>
    </div>
  );
}
