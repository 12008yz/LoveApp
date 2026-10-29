import { NextResponse } from "next/server";
import { requireCoupleApi } from "@/lib/session";
import { setTyping } from "@/lib/chat-typing";

export async function POST() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  setTyping(authResult.couple.id, authResult.user.id);
  return NextResponse.json({ ok: true });
}
