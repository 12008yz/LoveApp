import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { GamesClient } from "./games-client";

export default async function GamesPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Игры"
        subtitle="Выберите игру для двоих — джойстик в вашей комнате."
      />
      <GamesClient />
    </div>
  );
}
