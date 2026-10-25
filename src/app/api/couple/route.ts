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
            include: {
              user: { select: { id: true, displayName: true, email: true, avatarPath: true } },
            },
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
    include: { couple: { include: { members: true } } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Нет пары" }, { status: 404 });
  }

  const partnerIds = membership.couple.members
    .map((m) => m.userId)
    .filter((id) => id !== authResult.user.id);

  await prisma.couple.delete({ where: { id: membership.coupleId } });

  // Remove placeholder demo partners created by /api/couple/demo
  if (partnerIds.length) {
    await prisma.user.deleteMany({
      where: {
        id: { in: partnerIds },
        email: { endsWith: "@loveapp.local" },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
