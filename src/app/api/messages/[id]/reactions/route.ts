import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { aggregateReactions, reactionSchema } from "@/lib/chat-messages";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const { id: messageId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = reactionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректная реакция" }, { status: 400 });
  }

  const message = await prisma.message.findFirst({
    where: { id: messageId, coupleId: authResult.couple.id },
    select: { id: true },
  });
  if (!message) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const emoji = parsed.data.emoji;
  const existing = await prisma.messageReaction.findUnique({
    where: {
      messageId_userId: { messageId, userId: authResult.user.id },
    },
  });

  if (existing?.emoji === emoji) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.messageReaction.update({
      where: { id: existing.id },
      data: { emoji },
    });
  } else {
    await prisma.messageReaction.create({
      data: { messageId, userId: authResult.user.id, emoji },
    });
  }

  // Touch message so SSE sees removals (deleted rows no longer bump reaction.updatedAt).
  await prisma.message.update({
    where: { id: messageId },
    data: { reactionsUpdatedAt: new Date() },
  });

  const rows = await prisma.messageReaction.findMany({
    where: { messageId },
    select: { emoji: true, userId: true },
  });

  return NextResponse.json({
    messageId,
    reactions: aggregateReactions(rows, authResult.user.id),
  });
}
