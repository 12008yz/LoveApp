"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { DemoEnterButton } from "@/components/demo-enter-button";
import { Button, ErrorText, Field, Input, Panel } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Неверный email или пароль");
      return;
    }
    const next = params.get("next") || "/home";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/home";
    router.push(safeNext);
    router.refresh();
  }

  return (
    <div className="auth-shell">
      <form onSubmit={onSubmit}>
        <Panel title="Вход" narrow>
          <p className="ui-muted" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
            С возвращением в ваш домик.
          </p>
          {error ? <ErrorText>{error}</ErrorText> : null}
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
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" block disabled={loading}>
            {loading ? "Входим…" : "Войти"}
          </Button>
          <p className="ui-muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
            Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
          </p>
        </Panel>
      </form>
      <div style={{ marginTop: "0.85rem", maxWidth: 420, marginInline: "auto" }}>
        <DemoEnterButton variant="secondary" block />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
