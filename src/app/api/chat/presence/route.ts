import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function POST() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const user = await prisma.user.update({
    where: { id: authResult.user.id },
    data: { lastSeenAt: new Date() },
    select: { lastSeenAt: true },
  });

  return NextResponse.json({
    ok: true,
    lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
  });
}
