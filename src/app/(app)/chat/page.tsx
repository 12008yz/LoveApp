import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader
        title="Чат"
        subtitle="Только вы двое. Можно сменить имя и фото, отправить стикер."
      />

      <ChatClient />
    </div>
  );
}
