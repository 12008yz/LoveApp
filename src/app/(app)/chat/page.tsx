import { requireCouple } from "@/lib/session";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const { membership, couple } = await requireCouple();
  const partnerMember = couple.members.find((m) => m.userId !== membership.userId);
  const partner = partnerMember
    ? {
        id: partnerMember.user.id,
        displayName: partnerMember.user.displayName,
        avatarPath: partnerMember.user.avatarPath,
        genderRole: partnerMember.genderRole,
        lastSeenAt: partnerMember.user.lastSeenAt?.toISOString() ?? null,
      }
    : null;

  return <ChatClient partner={partner} />;
}
