import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { DiaryClient } from "./diary-client";

export default async function DiaryPage() {
  await requireCouple();
  return (
    <div className="diary-page">
      <SectionHeader title="Дневник" subtitle="Общая тетрадь на двоих." />
      <DiaryClient />
    </div>
  );
}
