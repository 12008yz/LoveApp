import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const { id: mediaItemId, commentId } = await ctx.params;

  const comment = await prisma.mediaComment.findFirst({
    where: {
      id: commentId,
      mediaItemId,
      mediaItem: { coupleId: authResult.couple.id },
    },
  });
  if (!comment) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  if (comment.authorId !== authResult.user.id) {
    return NextResponse.json({ error: "Можно удалить только свой комментарий" }, { status: 403 });
  }

  await prisma.mediaComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
