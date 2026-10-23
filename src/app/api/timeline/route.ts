import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const events = await prisma.timelineEvent.findMany({
    where: { coupleId: authResult.couple.id },
    orderBy: { happenedAt: "desc" },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ events });
}

const schema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(5000).optional(),
  happenedAt: z.string().datetime(),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте веху" }, { status: 400 });
  }

  const event = await prisma.timelineEvent.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      title: parsed.data.title.trim(),
      body: parsed.data.body?.trim() || null,
      happenedAt: new Date(parsed.data.happenedAt),
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ event }, { status: 201 });
}
