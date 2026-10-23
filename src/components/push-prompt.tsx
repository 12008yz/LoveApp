"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushPrompt() {
  const [status, setStatus] = useState<"idle" | "on" | "denied" | "unsupported">("idle");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "granted") setStatus("on");
    if (Notification.permission === "denied") setStatus("denied");
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapid = await fetch("/api/push/vapid").then((r) => r.json());
      if (!vapid.publicKey) throw new Error("VAPID не настроен");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      setStatus("on");
    } catch {
      setStatus("denied");
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported" || status === "on") return null;

  return (
    <div className="soft-panel" style={{ marginBottom: "1rem" }}>
      <strong>Уведомления</strong>
      <p className="muted" style={{ margin: "0.35rem 0 0.75rem" }}>
        {status === "denied"
          ? "Разрешение отклонено в браузере. Включите уведомления в настройках сайта."
          : "Включите пуши — узнаете о сообщениях и напоминаниях календаря, даже если вкладка закрыта."}
      </p>
      {status !== "denied" ? (
        <button type="button" className="btn btn-secondary" onClick={enable} disabled={busy}>
          {busy ? "Подключаем…" : "Включить уведомления"}
        </button>
      ) : null}
    </div>
  );
}
