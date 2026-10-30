import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { AlbumClient } from "./album-client";

export default async function AlbumPage() {
  const { user } = await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Альбом"
        subtitle="Совместные кадры — под каждым можно оставить пару слов."
      />
      <AlbumClient meId={user.id} />
    </div>
  );
}
