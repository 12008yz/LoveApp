import { NextResponse } from "next/server";
import { z } from "zod";
import { format, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const from = format(subDays(new Date(), 6), "yyyy-MM-dd");
  const checkIns = await prisma.moodCheckIn.findMany({
    where: {
      coupleId: authResult.couple.id,
      day: { gte: from },
    },
    orderBy: { day: "asc" },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ checkIns });
}

const schema = z.object({
  score: z.number().int().min(1).max(5),
  note: z.string().max(300).optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Оценка от 1 до 5" }, { status: 400 });
  }

  const day = parsed.data.day || format(new Date(), "yyyy-MM-dd");
  const checkIn = await prisma.moodCheckIn.upsert({
    where: {
      authorId_day: {
        authorId: authResult.user.id,
        day,
      },
    },
    create: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      score: parsed.data.score,
      note: parsed.data.note?.trim() || null,
      day,
    },
    update: {
      score: parsed.data.score,
      note: parsed.data.note?.trim() || null,
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ checkIn }, { status: 201 });
}
