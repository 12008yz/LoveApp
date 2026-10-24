import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { ConstellationClient } from "./constellation-client";

export default async function ConstellationPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Созвездие воспоминаний"
        subtitle="Только самые важные моменты — те, что хотите помнить всю жизнь."
      />
      <ConstellationClient />
    </div>
  );
}
