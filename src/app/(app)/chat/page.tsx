import { requireCouple } from "@/lib/session";
import { ChatClient } from "./chat-client";

export default async function ChatPage() {
  await requireCouple();
  return <ChatClient />;
}
