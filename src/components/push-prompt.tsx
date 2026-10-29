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
  const [status, setStatus] = useState<
    "loading" | "idle" | "on" | "denied" | "unsupported" | "error"
  >("loading");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (Notification.permission !== "granted") {
      setStatus("idle");
      return;
    }

    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setStatus(sub ? "on" : "idle");
      })
      .catch(() => setStatus("idle"));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidRes = await fetch("/api/push/vapid");
      if (!vapidRes.ok) throw new Error(`VAPID API: ${vapidRes.status}`);
      const vapid = (await vapidRes.json()) as { publicKey?: string };
      const publicKey = vapid.publicKey?.trim() || "";
      if (!publicKey) throw new Error("VAPID не настроен на сервере");

      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setStatus("denied");
        return;
      }
      if (permission !== "granted") {
        setStatus("idle");
        setError("Разрешение не выдано");
        return;
      }

      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe().catch(() => {});

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Браузер не вернул ключи подписки");
      }

      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!save.ok) {
        const body = (await save.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Подписка не сохранена (${save.status})`);
      }
      setStatus("on");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось включить уведомления";
      setError(message);
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return null;

  const body =
    status === "unsupported"
      ? "Этот браузер не поддерживает пуши. На iPhone откройте сайт через ярлык на домашнем экране (iOS 16.4+)."
      : status === "denied"
        ? "Браузер заблокировал уведомления для этого сайта. Снимите запрет в настройках сайта/приложения на телефоне, затем нажмите «Проверить снова»."
        : status === "on"
          ? "Уведомления включены. Если пуши не приходят — нажмите «Переподключить»."
          : "Включите пуши — узнаете о сообщениях и напоминаниях календаря, даже если вкладка закрыта.";

  return (
    <div className="soft-panel" style={{ marginBottom: "1rem" }}>
      <strong>Уведомления</strong>
      <p className="muted" style={{ margin: "0.35rem 0 0.75rem" }}>
        {body}
      </p>
      {error ? (
        <p className="muted" style={{ margin: "0 0 0.75rem", color: "#b4234a" }}>
          {error}
        </p>
      ) : null}
      {status === "denied" ? (
        <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
          Проверить снова
        </button>
      ) : status === "unsupported" ? null : (
        <button type="button" className="btn btn-secondary" onClick={enable} disabled={busy}>
          {busy ? "Подключаем…" : status === "on" ? "Переподключить" : "Включить уведомления"}
        </button>
      )}
    </div>
  );
}
