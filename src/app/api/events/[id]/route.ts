import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, coupleId: authResult.couple.id },
  });
  if (!event) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
