import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { clearTyping } from "@/lib/chat-typing";
import { MESSAGE_INCLUDE, patchMessageSchema, toMessageDto } from "@/lib/chat-messages";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchMessageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректное сообщение" }, { status: 400 });
  }

  const body = parsed.data.body.trim();
  if (!body) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  const existing = await prisma.message.findFirst({
    where: { id, coupleId: authResult.couple.id },
    select: { id: true, authorId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  if (existing.authorId !== authResult.user.id) {
    return NextResponse.json({ error: "Можно менять только свои сообщения" }, { status: 403 });
  }

  const message = await prisma.message.update({
    where: { id },
    data: { body, editedAt: new Date() },
    include: MESSAGE_INCLUDE,
  });

  clearTyping(authResult.couple.id, authResult.user.id);

  return NextResponse.json({ message: toMessageDto(message, authResult.user.id) });
}
