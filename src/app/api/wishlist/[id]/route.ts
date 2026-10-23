import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const item = await prisma.wishlistItem.findFirst({
    where: { id, coupleId: authResult.couple.id },
  });
  if (!item) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  const updated = await prisma.wishlistItem.update({
    where: { id },
    data: {
      fulfilled: typeof body.fulfilled === "boolean" ? body.fulfilled : item.fulfilled,
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;

  const item = await prisma.wishlistItem.findFirst({
    where: { id, coupleId: authResult.couple.id },
  });
  if (!item) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  await prisma.wishlistItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
