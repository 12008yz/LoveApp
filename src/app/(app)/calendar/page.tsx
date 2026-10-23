import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { CalendarClient } from "./calendar-client";

export default async function CalendarPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader title="Календарь" subtitle="Важные даты и мягкие напоминания." />
      <CalendarClient />
    </div>
  );
}
