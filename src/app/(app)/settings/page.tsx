import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { SettingsPanel } from "./settings-panel";

export default async function SettingsPage() {
  const { membership, couple } = await requireCouple();
  const partner = couple.members.find((m) => m.userId !== membership.userId);
  const demoCouple = Boolean(partner?.user.email?.endsWith("@loveapp.local"));

  return (
    <div>
      <SectionHeader
        title="Настройки"
        subtitle="Уведомления, код пары и опасные действия."
      />
      <SettingsPanel inviteCode={couple.inviteCode} demoCouple={demoCouple} />
    </div>
  );
}
