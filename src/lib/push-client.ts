/** Browser-side Web Push subscribe helpers (shared by Home prompt + Settings). */

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/** Request permission, subscribe, save to /api/push/subscribe. */
export async function enableWebPush(): Promise<void> {
  if (!pushSupported()) {
    throw new Error("Этот браузер не поддерживает пуши");
  }

  // Ensure SW is registered (PwaRegister may not have finished yet).
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    /* ready() below will surface a clearer failure if SW is unavailable */
  }
  const reg = await navigator.serviceWorker.ready;
  const vapidRes = await fetch("/api/push/vapid");
  if (!vapidRes.ok) throw new Error(`VAPID API: ${vapidRes.status}`);
  const vapid = (await vapidRes.json()) as { publicKey?: string; enabled?: boolean };
  const publicKey = vapid.publicKey?.trim() || "";
  if (!publicKey) throw new Error("VAPID не настроен на сервере (пустые ключи в .env)");

  const permission = await Notification.requestPermission();
  if (permission === "denied") {
    throw new Error("Разрешение отклонено в настройках браузера/сайта");
  }
  if (permission !== "granted") {
    throw new Error("Разрешение не выдано");
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
}
