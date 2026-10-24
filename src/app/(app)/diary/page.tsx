import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { DiaryClient } from "./diary-client";

export default async function DiaryPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Дневник"
        subtitle="Как переписка: её заметки — с розовой пометкой, его — с голубой."
      />
      <DiaryClient />
    </div>
  );
}
