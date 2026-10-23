import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <section className="landing">
      <div className="hero-copy">
        <p className="brand-hero">LoveApp</p>
        <h2>Ваш общий домик</h2>
        <p>Чат, дневник и воспоминания — только для вас двоих, удобно с телефона.</p>
        <div className="cta-row">
          <Link href="/register">
            <Button>Создать аккаунт</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Войти</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
