import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { MapClient } from "./map-client";

export default async function MapPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader title="Карта" subtitle="Места, которые важны вам двоим." />
      <MapClient />
    </div>
  );
}
