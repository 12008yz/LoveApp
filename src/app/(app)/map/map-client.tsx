"use client";

import { FormEvent, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ListSkeleton, listEnterStyle } from "@/components/list-motion";

const PlacesMap = dynamic(() => import("./places-map"), { ssr: false });

type Place = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  notes: string | null;
  visitAt: string | null;
};

export function MapClient() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [lat, setLat] = useState(55.75);
  const [lng, setLng] = useState(37.62);
  const [ready, setReady] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/places");
      const json = await res.json();
      setPlaces(json.places || []);
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
    const visitRaw = String(fd.get("visitAt") || "");
    const res = await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        address: fd.get("address") || undefined,
        lat: Number(fd.get("lat")),
        lng: Number(fd.get("lng")),
        notes: fd.get("notes") || undefined,
        visitAt: visitRaw ? new Date(visitRaw).toISOString() : undefined,
      }),
    });
    const json = await res.json();
    if (json.place) {
      e.currentTarget.reset();
      setLat(55.75);
      setLng(37.62);
      setPlaces((prev) => [json.place, ...prev]);
    }
  }

  return (
    <div className="stack">
      <form className="soft-panel" onSubmit={onSubmit}>
        <p className="meta" style={{ marginTop: 0 }}>
          Нажмите на карту, чтобы поставить точку. Укажите адрес и когда хотите туда сходить.
        </p>
        <div className="field">
          <label htmlFor="name">Как назовём</label>
          <input id="name" name="name" required placeholder="Наше кафе" />
        </div>
        <div className="field">
          <label htmlFor="address">Адрес</label>
          <input id="address" name="address" placeholder="ул. …, дом …" />
        </div>
        <div className="field">
          <label htmlFor="visitAt">День и время</label>
          <input id="visitAt" name="visitAt" type="datetime-local" />
        </div>
        <input type="hidden" name="lat" value={lat} />
        <input type="hidden" name="lng" value={lng} />
        <div className="field">
          <label htmlFor="notes">Заметка</label>
          <textarea id="notes" name="notes" placeholder="Возьмём торт / столик у окна" />
        </div>
        <p className="meta">
          Точка: {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
        <button className="btn btn-primary" type="submit">
          Добавить свидание
        </button>
      </form>
      <div className="map-frame">
        <PlacesMap
          places={places}
          pick={{ lat, lng }}
          onPick={(next) => {
            setLat(next.lat);
            setLng(next.lng);
          }}
        />
      </div>
      <div className="soft-panel">
        {!ready ? <ListSkeleton rows={3} /> : null}
        {ready && places.length === 0 ? (
          <p className="muted">Пока нет мест — отметьте первое свидание на карте.</p>
        ) : null}
        {ready
          ? places.map((p, i) => (
          <div key={p.id} className="list-item list-enter" style={listEnterStyle(i)}>
            <strong>{p.name}</strong>
            {p.address ? <div>{p.address}</div> : null}
            <div className="meta">
              {p.visitAt
                ? new Date(p.visitAt).toLocaleString("ru-RU")
                : "Дата не указана"}{" "}
              · {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
            </div>
            {p.notes ? <p>{p.notes}</p> : null}
          </div>
            ))
          : null}
      </div>
    </div>
  );
}
