"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingClient() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const startedRaw = String(fd.get("startedAt") || "");
    const res = await fetch("/api/couple/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genderRole: fd.get("genderRole"),
        startedAt: startedRaw ? new Date(startedRaw).toISOString() : null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Не удалось создать пару");
      return;
    }
    router.push("/waiting");
    router.refresh();
  }

  async function onJoin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/couple/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode: String(fd.get("inviteCode")),
        genderRole: fd.get("genderRole"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Не удалось присоединиться");
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <div className="onboard-shell">
      <div className="panel" style={{ width: "min(520px, 100%)" }}>
        <h1>Соберите пару</h1>
        <p className="muted">
          LoveApp — для мальчика и девочки. Один создаёт домик, второй входит по коду.
        </p>
        <div className="cta-row" style={{ justifyContent: "flex-start", marginBottom: "1rem" }}>
          <button
            type="button"
            className={mode === "create" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setMode("create")}
          >
            Создать пару
          </button>
          <button
            type="button"
            className={mode === "join" ? "btn btn-primary" : "btn btn-secondary"}
            onClick={() => setMode("join")}
          >
            Есть код
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}

        {mode === "create" ? (
          <form onSubmit={onCreate}>
            <div className="field">
              <label htmlFor="genderRole">Кто вы</label>
              <select id="genderRole" name="genderRole" required defaultValue="boy">
                <option value="boy">Мальчик</option>
                <option value="girl">Девочка</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="startedAt">Дата начала отношений (необязательно)</label>
              <input id="startedAt" name="startedAt" type="date" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Создаём…" : "Создать и получить код"}
            </button>
          </form>
        ) : (
          <form onSubmit={onJoin}>
            <div className="field">
              <label htmlFor="inviteCode">Код приглашения</label>
              <input id="inviteCode" name="inviteCode" required placeholder="Например AB12CD34" />
            </div>
            <div className="field">
              <label htmlFor="genderRoleJoin">Кто вы</label>
              <select id="genderRoleJoin" name="genderRole" required defaultValue="girl">
                <option value="boy">Мальчик</option>
                <option value="girl">Девочка</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Входим…" : "Присоединиться"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
