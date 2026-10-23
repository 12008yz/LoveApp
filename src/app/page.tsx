import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";
import { DemoEnterButton } from "@/components/demo-enter-button";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <section className="landing landing--cozy">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="landing__art" src="/art/landing-room.jpg" alt="" width={768} height={1024} />
      <div className="landing__scrim" aria-hidden />
      <div className="hero-copy">
        <p className="brand-hero">LoveApp</p>
        <h2>Ваш общий домик</h2>
        <p>Чат, дневник и воспоминания — только для вас двоих, удобно с телефона.</p>
        <div className="cta-row">
          <DemoEnterButton variant="primary" />
          <Link href="/register">
            <Button variant="secondary">Создать аккаунт</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost">Войти</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
