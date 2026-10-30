import { NextResponse } from "next/server";
import { buildFlamesStatus, moscowDayKey } from "@/lib/flames";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function POST() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const coupleId = authResult.couple.id;
  const meId = authResult.user.id;
  const today = moscowDayKey();

  await prisma.flameCheckIn.upsert({
    where: {
      coupleId_userId_day: { coupleId, userId: meId, day: today },
    },
    create: { coupleId, userId: meId, day: today },
    update: {},
  });

  const members = await prisma.coupleMember.findMany({
    where: { coupleId },
    select: { userId: true },
  });

  const checkIns = await prisma.flameCheckIn.findMany({
    where: { coupleId },
    select: { userId: true, day: true },
  });

  return NextResponse.json({
    flames: buildFlamesStatus({
      checkIns,
      memberIds: members.map((m) => m.userId),
      meId,
      today,
      forceMeChecked: true,
    }),
  });
}
