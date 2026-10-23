import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { PingsClient } from "./pings-client";

export default async function PingsPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader title="Пинги" subtitle="Короткий сигнал, когда слов много не нужно." />
      <PingsClient />
    </div>
  );
}
