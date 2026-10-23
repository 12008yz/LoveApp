import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const events = await prisma.event.findMany({
    where: { coupleId: authResult.couple.id },
    orderBy: { occursAt: "asc" },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ events });
}

const schema = z.object({
  title: z.string().min(1).max(120),
  notes: z.string().max(2000).optional(),
  occursAt: z.string().datetime(),
  remindAt: z.string().datetime().optional().nullable(),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте поля события" }, { status: 400 });
  }

  const occursAt = new Date(parsed.data.occursAt);
  const remindAt = parsed.data.remindAt ? new Date(parsed.data.remindAt) : null;
  if (remindAt && Number.isNaN(remindAt.getTime())) {
    return NextResponse.json({ error: "Некорректное напоминание" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      title: parsed.data.title.trim(),
      notes: parsed.data.notes?.trim() || null,
      occursAt,
      remindAt,
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ event }, { status: 201 });
}
