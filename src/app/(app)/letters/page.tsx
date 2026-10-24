import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { LettersClient } from "./letters-client";

export default async function LettersPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Письма"
        subtitle="Напишите сейчас — откроется позже. Как кусочек бумаги для двоих."
      />
      <LettersClient />
    </div>
  );
}
