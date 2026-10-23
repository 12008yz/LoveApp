"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function JoinClient({
  inviteCode,
  found,
  takenRole,
  full,
}: {
  inviteCode: string;
  found: boolean;
  takenRole: string | null;
  full: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const defaultRole = takenRole === "boy" ? "girl" : "boy";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/couple/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode,
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

  if (!found) {
    return (
      <div className="onboard-shell">
        <div className="panel">
          <h1>Ссылка недействительна</h1>
          <p className="muted">Код {inviteCode} не найден. Попросите партнёра прислать новую ссылку.</p>
          <Link href="/onboarding" className="btn btn-primary">
            К созданию пары
          </Link>
        </div>
      </div>
    );
  }

  if (full) {
    return (
      <div className="onboard-shell">
        <div className="panel">
          <h1>Пара уже заполнена</h1>
          <p className="muted">По этому коду уже двое. Войдите в свой аккаунт или создайте новую пару.</p>
          <Link href="/home" className="btn btn-primary">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="onboard-shell">
      <div className="panel">
        <h1>Присоединиться к паре</h1>
        <p className="muted">
          Код <strong>{inviteCode}</strong>
          {takenRole
            ? ` — роль «${takenRole === "boy" ? "мальчик" : "девочка"}» уже занята.`
            : "."}
        </p>
        {error ? <p className="error-text">{error}</p> : null}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="genderRole">Кто вы</label>
            <select id="genderRole" name="genderRole" required defaultValue={defaultRole}>
              <option value="boy" disabled={takenRole === "boy"}>
                Мальчик
              </option>
              <option value="girl" disabled={takenRole === "girl"}>
                Девочка
              </option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Входим…" : "Присоединиться"}
          </button>
        </form>
      </div>
    </div>
  );
}
