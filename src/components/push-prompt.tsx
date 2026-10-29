"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { enableWebPush, pushSupported } from "@/lib/push-client";

export function PushPrompt() {
  const [status, setStatus] = useState<"loading" | "idle" | "on" | "denied" | "unsupported" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
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
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? "on" : "idle"))
      .catch(() => setStatus("idle"));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      await enableWebPush();
      setStatus("on");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось включить уведомления";
      setError(message);
      if (message.includes("отклонен")) setStatus("denied");
      else setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "on" || status === "unsupported") return null;

  return (
    <div className="soft-panel" style={{ marginBottom: "1rem" }}>
      <strong>Уведомления</strong>
      <p className="muted" style={{ margin: "0.35rem 0 0.75rem" }}>
        {status === "denied"
          ? "Браузер заблокировал уведомления. Управление — в Настройках."
          : "Включите пуши — или откройте Настройки → Уведомления (там же тест)."}
      </p>
      {error ? (
        <p className="muted" style={{ margin: "0 0 0.75rem", color: "#b4234a" }}>
          {error}
        </p>
      ) : null}
      <div className="cta-row" style={{ justifyContent: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
        {status !== "denied" ? (
          <button type="button" className="btn btn-secondary" onClick={enable} disabled={busy}>
            {busy ? "Подключаем…" : "Включить"}
          </button>
        ) : null}
        <Link href="/settings" className="btn btn-secondary">
          Настройки
        </Link>
      </div>
    </div>
  );
}
