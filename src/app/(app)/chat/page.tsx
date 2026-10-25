import { requireCouple } from "@/lib/session";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  const { user, couple } = await requireCouple();
  const partnerMember = couple.members.find((m) => m.userId !== user.id);
  const partner = partnerMember
    ? {
        id: partnerMember.user.id,
        displayName: partnerMember.user.displayName,
        avatarPath: partnerMember.user.avatarPath,
      }
    : null;

  return <ChatClient partner={partner} />;
}
