import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { DiaryClient } from "./diary-client";

export default async function DiaryPage() {
  await requireCouple();
  return (
    <div className="diary-page">
      <div className="diary-page__content">
        <SectionHeader title="Дневник" subtitle="Лента наших дней." />
        <DiaryClient />
      </div>
    </div>
  );
}
