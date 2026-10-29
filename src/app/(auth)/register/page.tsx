"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button, ErrorText, Field, Input, Panel } from "@/components/ui";

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
      <form onSubmit={onSubmit}>
        <Panel title="Регистрация" narrow>
          <p className="ui-muted" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
            {nextPath.startsWith("/join/")
              ? "Создайте аккаунт, чтобы принять приглашение."
              : "Создайте аккаунт, затем пригласите партнёра."}
          </p>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Field label="Имя" htmlFor="displayName">
            <Input id="displayName" name="displayName" required maxLength={40} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Пароль" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
          <Button type="submit" block disabled={loading}>
            {loading ? "Создаём…" : "Создать аккаунт"}
          </Button>
          <p className="ui-muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
            Уже есть аккаунт? <Link href={loginHref}>Войти</Link>
          </p>
        </Panel>
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
