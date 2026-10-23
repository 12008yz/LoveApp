import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;

  const letter = await prisma.letter.findFirst({
    where: { id, coupleId: authResult.couple.id },
  });
  if (!letter) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  if (letter.unlockAt > new Date()) {
    return NextResponse.json({ error: "Ещё рано" }, { status: 403 });
  }

  const updated = await prisma.letter.update({
    where: { id },
    data: { openedAt: letter.openedAt ?? new Date() },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ letter: updated });
}
