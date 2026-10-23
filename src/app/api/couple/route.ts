import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireUserApi();
  if ("error" in authResult) return authResult.error;

  const membership = await prisma.coupleMember.findUnique({
    where: { userId: authResult.user.id },
    include: {
      couple: {
        include: {
          members: {
            include: { user: { select: { id: true, displayName: true, email: true } } },
          },
        },
      },
    },
  });

  return NextResponse.json({ membership });
}

export async function DELETE() {
  const authResult = await requireUserApi();
  if ("error" in authResult) return authResult.error;

  const membership = await prisma.coupleMember.findUnique({
    where: { userId: authResult.user.id },
  });
  if (!membership) {
    return NextResponse.json({ error: "Нет пары" }, { status: 404 });
  }

  await prisma.couple.delete({ where: { id: membership.coupleId } });
  return NextResponse.json({ ok: true });
}
