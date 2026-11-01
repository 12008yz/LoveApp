import { NextResponse } from "next/server";
import { buildFlamesStatus, moscowDayKey } from "@/lib/flames";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { requireCoupleApi } from "@/lib/session";

export async function POST() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const coupleId = authResult.couple.id;
  const meId = authResult.user.id;
  const today = moscowDayKey();

  const alreadyLit = await prisma.flameCheckIn.findUnique({
    where: {
      coupleId_userId_day: { coupleId, userId: meId, day: today },
    },
    select: { id: true },
  });

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

  // Nudge partner only on the first light today, and only if they haven't lit yet.
  if (!alreadyLit) {
    const partnerId = members.map((m) => m.userId).find((id) => id !== meId);
    if (partnerId) {
      const partnerLit = checkIns.some(
        (row) => row.userId === partnerId && row.day === today,
      );
      if (!partnerLit) {
        void sendPushToUser(partnerId, {
          title: "Огонёк любви",
          body: "Вторая половинка зажгла свою сторону — зайди и продли огонь ещё на один день",
          url: "/home",
        });
      }
    }
  }

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
