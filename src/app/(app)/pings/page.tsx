import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { PingsClient } from "./pings-client";

export default async function PingsPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Сигналы"
        subtitle="Нажми — партнёру придёт уведомление. Скучаю, обними, люблю — без лишних слов."
      />
      <PingsClient />
    </div>
  );
}
