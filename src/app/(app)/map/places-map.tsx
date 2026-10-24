"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  notes: string | null;
  address?: string | null;
  visitAt?: string | null;
};

function PickLayer({
  onPick,
}: {
  onPick?: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function PlacesMap({
  places,
  pick,
  onPick,
}: {
  places: Place[];
  pick?: { lat: number; lng: number };
  onPick?: (coords: { lat: number; lng: number }) => void;
}) {
  const center: [number, number] =
    places.length > 0 ? [places[0].lat, places[0].lng] : [pick?.lat ?? 55.75, pick?.lng ?? 37.62];

  return (
    <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PickLayer onPick={onPick} />
      {pick ? <Marker position={[pick.lat, pick.lng]} icon={icon} /> : null}
      {places.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={icon}>
          <Popup>
            <strong>{p.name}</strong>
            {p.address ? <div>{p.address}</div> : null}
            {p.visitAt ? <div>{new Date(p.visitAt).toLocaleString("ru-RU")}</div> : null}
            {p.notes ? <div>{p.notes}</div> : null}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
