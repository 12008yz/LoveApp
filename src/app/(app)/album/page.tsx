import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { AlbumClient } from "./album-client";

export default async function AlbumPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Альбом"
        subtitle="Совместные фото в ленте — к каждому можно добавить пару слов."
      />
      <AlbumClient />
    </div>
  );
}
