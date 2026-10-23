import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <section className="landing">
      <div className="hero-copy">
        <p className="brand-hero">LoveApp</p>
        <h2>Ваш общий домик в сети</h2>
        <p>
          Чат, дневник, письма на потом, альбом мест и маленькие игры — всё только для
          вас двоих.
        </p>
        <div className="cta-row">
          <Link href="/register" className="btn btn-primary">
            Создать аккаунт
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Войти
          </Link>
        </div>
      </div>
    </section>
  );
}
