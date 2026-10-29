import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

const schema = z.object({
  messageId: z.string().min(1).nullable(),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const { messageId } = parsed.data;
  if (messageId) {
    const message = await prisma.message.findFirst({
      where: { id: messageId, coupleId: authResult.couple.id },
      select: { id: true },
    });
    if (!message) {
      return NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 });
    }
  }

  const couple = await prisma.couple.update({
    where: { id: authResult.couple.id },
    data: { pinnedMessageId: messageId },
    select: { pinnedMessageId: true },
  });

  return NextResponse.json({ messageId: couple.pinnedMessageId });
}
