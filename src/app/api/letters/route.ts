import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { isActionableUnread, presentLetter } from "@/lib/letters";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const letters = await prisma.letter.findMany({
    where: { coupleId: authResult.couple.id },
    orderBy: { unlockAt: "asc" },
    include: { author: { select: { id: true, displayName: true } } },
  });

  const now = new Date();
  const masked = letters.map((letter) => presentLetter(letter, authResult.user.id, now));
  const unreadCount = masked.filter((letter) =>
    isActionableUnread(letter, authResult.user.id),
  ).length;

  return NextResponse.json({ letters: masked, unreadCount });
}

const schema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(10000),
  unlockAt: z.string().datetime(),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте письмо" }, { status: 400 });
  }

  const unlockAt = new Date(parsed.data.unlockAt);
  if (Number.isNaN(unlockAt.getTime())) {
    return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  }

  const letter = await prisma.letter.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
      unlockAt,
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json(
    {
      letter: {
        ...letter,
        locked: unlockAt > new Date(),
        canRead: true,
      },
    },
    { status: 201 },
  );
}
