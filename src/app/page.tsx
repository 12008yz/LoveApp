import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <section className="landing landing--cozy">
      <picture>
        <source srcSet="/art/landing-room.webp?v=6" type="image/webp" />
        <img
          className="landing__art"
          src="/art/landing-room.jpg?v=6"
          alt=""
          width={768}
          height={1024}
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <div className="landing__scrim" aria-hidden />
      <div className="hero-copy">
        <p className="brand-hero">LoveApp</p>
        <h2>Ваш общий домик</h2>
        <p>Чат, дневник и воспоминания — только для вас двоих, удобно с телефона.</p>
        <div className="cta-row">
          <Link href="/register">
            <Button variant="primary">Создать аккаунт</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost">Войти</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
