import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { MapClient } from "./map-client";

export default async function MapPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Свидания"
        subtitle="Отметьте на карте место, куда хотите сходить со своей второй половинкой — адрес, день и время."
      />
      <MapClient />
    </div>
  );
}
