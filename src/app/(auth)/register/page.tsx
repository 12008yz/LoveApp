"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/onboarding";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      displayName: String(fd.get("displayName")),
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Ошибка регистрации");
      return;
    }

    const login = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      setError("Аккаунт создан, но вход не удался");
      return;
    }
    const safeNext =
      nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/onboarding";
    router.push(safeNext);
    router.refresh();
  }

  const loginHref =
    nextPath.startsWith("/join/") && !nextPath.startsWith("//")
      ? `/login?next=${encodeURIComponent(nextPath)}`
      : "/login";

  return (
    <div className="auth-shell">
      <form className="panel" onSubmit={onSubmit}>
        <h1>Регистрация</h1>
        <p className="muted">
          {nextPath.startsWith("/join/")
            ? "Создайте аккаунт, чтобы принять приглашение."
            : "Создайте аккаунт, затем пригласите партнёра."}
        </p>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="field">
          <label htmlFor="displayName">Имя</label>
          <input id="displayName" name="displayName" required maxLength={40} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "Создаём…" : "Создать аккаунт"}
        </button>
        <p className="muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
          Уже есть аккаунт? <Link href={loginHref}>Войти</Link>
        </p>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
