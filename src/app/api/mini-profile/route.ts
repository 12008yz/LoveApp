import { NextResponse } from "next/server";
import { decryptPassword } from "@/lib/password-share";
import { buildFlamesStatus, moscowDayKey } from "@/lib/flames";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const coupleId = authResult.couple.id;
  const meId = authResult.user.id;
  const today = moscowDayKey();

  const members = await prisma.coupleMember.findMany({
    where: { coupleId },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarPath: true,
          passwordEnc: true,
        },
      },
    },
  });

  const meMember = members.find((m) => m.userId === meId);
  const partnerMember = members.find((m) => m.userId !== meId);

  function personDto(user: {
    id: string;
    displayName: string;
    email: string;
    avatarPath: string | null;
    passwordEnc: string | null;
  }) {
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      avatarPath: user.avatarPath,
      password: decryptPassword(user.passwordEnc),
    };
  }

  const checkIns = await prisma.flameCheckIn.findMany({
    where: { coupleId },
    select: { userId: true, day: true },
  });

  return NextResponse.json({
    me: meMember ? personDto(meMember.user) : null,
    partner: partnerMember ? personDto(partnerMember.user) : null,
    flames: buildFlamesStatus({
      checkIns,
      memberIds: members.map((m) => m.userId),
      meId,
      today,
    }),
  });
}
