import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const entries = await prisma.diaryEntry.findMany({
    where: { coupleId: authResult.couple.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ entries });
}

const schema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(20000),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Заполните заголовок и текст" }, { status: 400 });
  }

  const entry = await prisma.diaryEntry.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
