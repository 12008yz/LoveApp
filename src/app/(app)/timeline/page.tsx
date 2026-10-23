import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { TimelineClient } from "./timeline-client";

export default async function TimelinePage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader title="История" subtitle="Вехи, которые вы хотите помнить." />
      <TimelineClient />
    </div>
  );
}
