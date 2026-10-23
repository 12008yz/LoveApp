"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export function WaitingClient({
  inviteCode,
  role,
}: {
  inviteCode: string;
  role: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState("");
  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/join/${inviteCode}`;
  }, [inviteCode]);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("/api/couple");
      const data = await res.json();
      if (data.membership?.couple?.status === "active") {
        router.push("/home");
        router.refresh();
      }
    }, 2500);
    return () => clearInterval(id);
  }, [router]);

  async function copy(kind: "code" | "link") {
    const text = kind === "code" ? inviteCode : inviteUrl;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  async function continueDemo() {
    setDemoBusy(true);
    setDemoError("");
    const res = await fetch("/api/couple/demo", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setDemoBusy(false);
    if (!res.ok) {
      setDemoError(data.error || "Не удалось открыть демо");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="onboard-shell onboard-shell--waiting">
      <div className="panel">
        <h1>Ждём вторую половинку</h1>
        <p className="muted">
          Вы в паре как {role === "boy" ? "мальчик" : "девочка"}. Отправьте ссылку или код партнёру.
        </p>
        <div className="soft-panel" style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div className="meta">Ссылка-приглашение</div>
          <div style={{ wordBreak: "break-all", fontSize: "0.95rem", margin: "0.5rem 0" }}>
            {inviteUrl || `…/join/${inviteCode}`}
          </div>
          <div className="meta" style={{ marginTop: "0.75rem" }}>
            Код
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", letterSpacing: "0.12em" }}>
            {inviteCode}
          </div>
        </div>
        {demoError ? <p className="error-text">{demoError}</p> : null}
        <div className="stack">
          <button type="button" className="btn btn-primary" onClick={() => copy("link")} style={{ width: "100%" }}>
            {copied === "link" ? "Ссылка скопирована" : "Скопировать ссылку"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => copy("code")} style={{ width: "100%" }}>
            {copied === "code" ? "Код скопирован" : "Скопировать код"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void continueDemo()}
            disabled={demoBusy}
            style={{ width: "100%" }}
          >
            {demoBusy ? "Открываем…" : "Демо: войти без партнёра"}
          </button>
        </div>
      </div>
    </div>
  );
}
