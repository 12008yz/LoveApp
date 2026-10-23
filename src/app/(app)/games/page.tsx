import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { GamesClient } from "./games-client";

export default async function GamesPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader title="Игры" subtitle="Лёгкие партии только для вас двоих." />
      <GamesClient />
    </div>
  );
}
