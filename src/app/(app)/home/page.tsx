import Link from "next/link";
import { requireCouple } from "@/lib/session";
import { PushPrompt } from "@/components/push-prompt";
import { SettingsPanel } from "./settings-panel";

const tiles = [
  { href: "/chat", title: "Чат", desc: "Пишите друг другу в реальном времени" },
  { href: "/diary", title: "Дневник", desc: "Общие записи вашего дня" },
  { href: "/pings", title: "Пинги", desc: "Быстрые сигналы настроения" },
  { href: "/calendar", title: "Календарь", desc: "Даты и напоминания" },
  { href: "/letters", title: "Письма", desc: "Откроются когда придёт время" },
  { href: "/album", title: "Альбом", desc: "Фото с подписями" },
  { href: "/map", title: "Карта", desc: "Ваши места на карте" },
  { href: "/timeline", title: "История", desc: "Вехи отношений" },
  { href: "/games", title: "Игры", desc: "Крестики-нолики и слова" },
  { href: "/wishlist", title: "Желания", desc: "Wishlist подарков" },
  { href: "/care", title: "Забота", desc: "Что радует и что бесит" },
  { href: "/mood", title: "Настроение", desc: "Check-in за неделю" },
];

export default async function HomePage() {
  const { membership, couple } = await requireCouple();
  const partner = couple.members.find((m) => m.userId !== membership.userId);

  return (
    <div>
      <section className="home-hero">
        <h1>LoveApp</h1>
        <p>
          Привет, {membership.user.displayName}
          {partner ? ` — здесь вы с ${partner.user.displayName}` : ""}. Это ваш общий
          домик.
          {couple.startedAt
            ? ` Вместе с ${new Date(couple.startedAt).toLocaleDateString("ru-RU")}.`
            : ""}
        </p>
      </section>
      <PushPrompt />
      <div className="grid-2">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} prefetch={false} className="tile-link">
            <strong>{tile.title}</strong>
            <span>{tile.desc}</span>
          </Link>
        ))}
      </div>
      <div style={{ marginTop: "1.5rem" }}>
        <SettingsPanel inviteCode={couple.inviteCode} />
      </div>
    </div>
  );
}
