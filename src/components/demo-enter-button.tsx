"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

type Props = {
  variant?: "primary" | "secondary" | "ghost";
  block?: boolean;
  className?: string;
};

export function DemoEnterButton({
  variant = "secondary",
  block,
  className,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function enterDemo() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        email?: string;
        password?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.email || !data?.password) {
        setError(data?.error || "Не удалось открыть демо");
        return;
      }
      const login = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (login?.error) {
        setError("Демо создано, но вход не удался");
        return;
      }
      router.push("/home");
      router.refresh();
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={variant}
        block={block}
        disabled={busy}
        onClick={() => void enterDemo()}
      >
        {busy ? "Открываем демо…" : "Попробовать демо"}
      </Button>
      {error ? (
        <p className="error-text" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
