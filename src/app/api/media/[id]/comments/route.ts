import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

const schema = z.object({
  body: z.string().trim().min(1).max(500),
});

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const { id: mediaItemId } = await ctx.params;
  const media = await prisma.mediaItem.findFirst({
    where: { id: mediaItemId, coupleId: authResult.couple.id },
    select: { id: true },
  });
  if (!media) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Напишите комментарий" }, { status: 400 });
  }

  const comment = await prisma.mediaComment.create({
    data: {
      mediaItemId,
      authorId: authResult.user.id,
      body: parsed.data.body,
    },
    include: {
      author: { select: { id: true, displayName: true, avatarPath: true } },
    },
  });

  return NextResponse.json({ comment }, { status: 201 });
}
