import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { MoodClient } from "./mood-client";

export default async function MoodPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader title="Настроение" subtitle="Короткий check-in и картинка за неделю." />
      <MoodClient />
    </div>
  );
}
