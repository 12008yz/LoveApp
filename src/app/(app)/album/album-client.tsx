"use client";

import { FormEvent, useEffect, useState } from "react";

type Place = { id: string; name: string };
type Item = {
  id: string;
  caption: string | null;
  filePath: string;
  createdAt: string;
  author: { displayName: string };
  place: Place | null;
};

export function AlbumClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const [mediaRes, placesRes] = await Promise.all([fetch("/api/media"), fetch("/api/places")]);
    const media = await mediaRes.json();
    const placesJson = await placesRes.json();
    setItems(media.items || []);
    setPlaces(placesJson.places || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/media", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Ошибка загрузки");
      return;
    }
    e.currentTarget.reset();
    setItems((prev) => [json.item, ...prev]);
  }

  return (
    <div className="stack">
      <form className="soft-panel" onSubmit={onSubmit}>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="field">
          <label htmlFor="file">Фото</label>
          <input id="file" name="file" type="file" accept="image/*" required />
        </div>
        <div className="field">
          <label htmlFor="caption">Подпись</label>
          <input id="caption" name="caption" maxLength={300} />
        </div>
        <div className="field">
          <label htmlFor="placeId">Место (опционально)</label>
          <select id="placeId" name="placeId" defaultValue="">
            <option value="">Без места</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" type="submit">
          Загрузить
        </button>
      </form>
      <div className="album-grid">
        {items.map((item) => (
          <figure key={item.id} className="soft-panel" style={{ margin: 0, padding: "0.5rem" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.filePath} alt={item.caption || "Фото"} />
            <figcaption style={{ padding: "0.5rem 0.25rem" }}>
              <div>{item.caption || "Без подписи"}</div>
              <div className="meta">
                {item.author.displayName}
                {item.place ? ` · ${item.place.name}` : ""}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
