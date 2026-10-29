"use client";

import { useEffect, useState } from "react";
import { enableWebPush, pushSupported } from "@/lib/push-client";

type Status = "loading" | "idle" | "on" | "denied" | "unsupported" | "error";

export function PushSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [vapidOk, setVapidOk] = useState<boolean | null>(null);

  async function refresh(opts?: { keepMessages?: boolean }) {
    if (!opts?.keepMessages) {
      setError(null);
      setInfo(null);
    }
    try {
      const vapid = await fetch("/api/push/vapid").then((r) => r.json());
      setVapidOk(Boolean(String(vapid.publicKey || "").trim()));
    } catch {
      setVapidOk(false);
    }

    if (!pushSupported()) {
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
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "idle");
    } catch {
      setStatus("idle");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onEnable() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await enableWebPush();
      setStatus("on");
      setInfo("Подписка сохранена. Нажмите «Тест push».");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось включить";
      setError(message);
      if (message.includes("отклонен") || message.includes("denied")) setStatus("denied");
      else setStatus("error");
    } finally {
      setBusy(false);
      // Keep error/info from this attempt; only refresh device/VAPID status.
      void refresh({ keepMessages: true });
    }
  }

  async function onTest() {
    setTesting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        sent?: number;
      } | null;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Тест не прошёл (${res.status})`);
      }
      setInfo(`Отправлено: ${json.sent ?? 1}. Проверьте шторку уведомлений.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Тест не удался");
    } finally {
      setTesting(false);
    }
  }

  const statusText =
    status === "unsupported"
      ? "Пуши не поддерживаются. На iPhone — только через ярлык на домашнем экране (iOS 16.4+), не из Safari-вкладки."
      : status === "denied"
        ? "Браузер заблокировал уведомления. Разрешите их в настройках сайта, обновите страницу."
        : status === "on"
          ? "Подписка активна на этом устройстве."
          : "Уведомления выключены на этом устройстве.";

  return (
    <div className="soft-panel" style={{ marginTop: "1rem" }}>
      <h2 style={{ fontFamily: "var(--font-display)", marginTop: 0 }}>Уведомления</h2>
      <p className="meta" style={{ marginTop: 0 }}>
        Сообщения в чате и напоминания календаря. Работают, даже если приложение закрыто (нужен
        разрешённый push).
      </p>
      <p className="meta">
        Сервер VAPID:{" "}
        {vapidOk === null ? "…" : vapidOk ? "ключи есть" : "ключи пустые — пуши не уйдут"}
      </p>
      <p className="meta" style={{ marginBottom: "0.75rem" }}>
        Устройство: {status === "loading" ? "…" : statusText}
      </p>
      {error ? (
        <p className="error-text" style={{ marginBottom: "0.75rem" }}>
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="meta" style={{ marginBottom: "0.75rem", color: "var(--rose-deep)" }}>
          {info}
        </p>
      ) : null}
      <div className="cta-row" style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        {status === "denied" ? (
          <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
            Проверить снова
          </button>
        ) : status === "unsupported" ? null : (
          <button type="button" className="btn btn-secondary" onClick={onEnable} disabled={busy}>
            {busy ? "Подключаем…" : status === "on" ? "Переподключить" : "Включить уведомления"}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={onTest}
          disabled={testing || status === "unsupported" || vapidOk === false}
          title={vapidOk === false ? "Сначала нужны VAPID-ключи на сервере" : undefined}
        >
          {testing ? "Шлём…" : "Тест push"}
        </button>
      </div>
    </div>
  );
}
