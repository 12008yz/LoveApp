"use client";

import { FormEvent, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const PlacesMap = dynamic(() => import("./places-map"), { ssr: false });

type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  notes: string | null;
};

export function MapClient() {
  const [places, setPlaces] = useState<Place[]>([]);

  async function load() {
    const res = await fetch("/api/places");
    const json = await res.json();
    setPlaces(json.places || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        lat: Number(fd.get("lat")),
        lng: Number(fd.get("lng")),
        notes: fd.get("notes") || undefined,
      }),
    });
    const json = await res.json();
    if (json.place) {
      e.currentTarget.reset();
      setPlaces((prev) => [json.place, ...prev]);
    }
  }

  return (
    <div className="stack">
      <form className="soft-panel" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="name">Название</label>
          <input id="name" name="name" required placeholder="Наше кафе" />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="lat">Широта</label>
            <input id="lat" name="lat" type="number" step="any" required defaultValue={55.75} />
          </div>
          <div className="field">
            <label htmlFor="lng">Долгота</label>
            <input id="lng" name="lng" type="number" step="any" required defaultValue={37.62} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="notes">Заметка</label>
          <textarea id="notes" name="notes" />
        </div>
        <button className="btn btn-primary" type="submit">
          Добавить место
        </button>
      </form>
      <div className="map-frame">
        <PlacesMap places={places} />
      </div>
      <div className="soft-panel">
        {places.map((p) => (
          <div key={p.id} className="list-item">
            <strong>{p.name}</strong>
            <div className="meta">
              {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
            </div>
            {p.notes ? <p>{p.notes}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
