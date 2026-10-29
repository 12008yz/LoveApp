import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canEditLetter, presentLetter } from "@/lib/letters";
import { requireCoupleApi } from "@/lib/session";

const schema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(10000),
  unlockAt: z.string().datetime(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;

  const letter = await prisma.letter.findFirst({
    where: { id, coupleId: authResult.couple.id },
  });
  if (!letter) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  if (!canEditLetter(letter, authResult.user.id)) {
    return NextResponse.json(
      { error: "Письмо уже открыто — править нельзя" },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте письмо" }, { status: 400 });
  }

  const unlockAt = new Date(parsed.data.unlockAt);
  if (Number.isNaN(unlockAt.getTime())) {
    return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  }

  const updated = await prisma.letter.update({
    where: { id },
    data: {
      title: parsed.data.title.trim(),
      body: parsed.data.body.trim(),
      unlockAt,
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({
    letter: presentLetter(updated, authResult.user.id),
  });
}
