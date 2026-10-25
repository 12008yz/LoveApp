import { requireCouple } from "@/lib/session";
import { PushPrompt } from "@/components/push-prompt";
import { HomeRoom } from "@/components/home-room";

export default async function HomePage() {
  const { membership, couple } = await requireCouple();
  const partner = couple.members.find((m) => m.userId !== membership.userId);

  return (
    <div className="home-page">
      <section className="home-hero home-hero--compact">
        <h1>LoveApp</h1>
        <p>
          Привет, {membership.user.displayName}
          {partner ? ` — здесь вы с ${partner.user.displayName}` : ""}.
          {couple.startedAt
            ? ` Вместе с ${new Date(couple.startedAt).toLocaleDateString("ru-RU")}.`
            : ""}
        </p>
      </section>
      <PushPrompt />
      <HomeRoom />
    </div>
  );
}
