"use client";

import { FormEvent, useEffect, useState } from "react";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";

type Item = {
  id: string;
  caption: string | null;
  filePath: string;
  createdAt: string;
  author: { displayName: string };
};

export function AlbumClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  async function load() {
    try {
      const mediaRes = await fetch("/api/media");
      const media = await mediaRes.json();
      setItems(media.items || []);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Ошибка загрузки");
      return;
    }
    form.reset();
    setPreview(null);
    setItems((prev) => [json.item, ...prev]);
  }

  return (
    <div className="stack">
      <form className="soft-panel" onSubmit={onSubmit}>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="field">
          <label htmlFor="file">Фотография</label>
          <input
            id="file"
            name="file"
            type="file"
            accept="image/*"
            required
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) {
                setPreview(null);
                return;
              }
              const url = URL.createObjectURL(file);
              setPreview(url);
            }}
          />
        </div>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            style={{
              width: "100%",
              maxHeight: 220,
              objectFit: "cover",
              borderRadius: "var(--radius-md)",
              marginBottom: "0.75rem",
            }}
          />
        ) : null}
        <div className="field">
          <label htmlFor="caption">Подпись к фото</label>
          <textarea
            id="caption"
            name="caption"
            required
            maxLength={300}
            placeholder="Что это за момент?"
            rows={3}
          />
        </div>
        <button className="btn btn-primary" type="submit">
          В ленту
        </button>
      </form>

      <div className="album-feed">
        {!ready ? <ListSkeleton rows={3} tall /> : null}
        {ready && items.length === 0 ? (
          <p className="muted">Лента пуста — добавьте первое совместное фото.</p>
        ) : null}
        {ready
          ? items.map((item, i) => (
          <figure key={item.id} className="album-feed__card list-enter" style={listEnterStyle(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.filePath} alt={item.caption || "Фото"} />
            <figcaption>
              <div style={{ whiteSpace: "pre-wrap" }}>{item.caption}</div>
              <div className="meta">
                {item.author.displayName} ·{" "}
                {new Date(item.createdAt).toLocaleString("ru-RU")}
              </div>
            </figcaption>
          </figure>
            ))
          : null}
      </div>
    </div>
  );
}
