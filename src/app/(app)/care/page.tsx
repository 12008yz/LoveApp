import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { CareClient } from "./care-client";

export default async function CarePage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Забота"
        subtitle="Что радует и что бесит — можно оставить только себе или поделиться."
      />
      <CareClient />
    </div>
  );
}
