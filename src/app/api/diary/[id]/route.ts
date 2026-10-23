import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

const schema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(20000),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;

  const entry = await prisma.diaryEntry.findFirst({
    where: { id, coupleId: authResult.couple.id },
  });
  if (!entry) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const updated = await prisma.diaryEntry.update({
    where: { id },
    data: {
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ entry: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;

  const entry = await prisma.diaryEntry.findFirst({
    where: { id, coupleId: authResult.couple.id },
  });
  if (!entry) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  await prisma.diaryEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
