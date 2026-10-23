import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { generateInviteCode } from "@/lib/invite";

async function createDemoPartnerUser() {
  return prisma.user.create({
    data: {
      email: `demo+${nanoid(10)}@loveapp.local`,
      displayName: "Демо-партнёр",
      passwordHash: await bcrypt.hash(nanoid(24), 8),
    },
  });
}

/** Demo: activate a solo “couple” with a placeholder partner — no waiting. */
export async function POST() {
  const authResult = await requireUserApi();
  if ("error" in authResult) return authResult.error;

  const userId = authResult.user.id;
  const existing = await prisma.coupleMember.findUnique({
    where: { userId },
    include: { couple: { include: { members: true } } },
  });

  if (existing?.couple.status === "active" && existing.couple.members.length >= 2) {
    return NextResponse.json({ ok: true, coupleId: existing.coupleId, already: true });
  }

  try {
    if (existing) {
      const members = existing.couple.members;
      const myRole = existing.genderRole === "girl" ? "girl" : "boy";
      const partnerRole = myRole === "boy" ? "girl" : "boy";

      if (members.length >= 2) {
        await prisma.couple.update({
          where: { id: existing.coupleId },
          data: { status: "active" },
        });
        return NextResponse.json({ ok: true, coupleId: existing.coupleId });
      }

      const partner = await createDemoPartnerUser();
      await prisma.$transaction([
        prisma.coupleMember.create({
          data: {
            userId: partner.id,
            coupleId: existing.coupleId,
            genderRole: partnerRole,
          },
        }),
        prisma.couple.update({
          where: { id: existing.coupleId },
          data: { status: "active" },
        }),
      ]);
      return NextResponse.json({ ok: true, coupleId: existing.coupleId });
    }

    const myRole = "boy";
    const partnerRole = "girl";
    const partner = await createDemoPartnerUser();
    const inviteCode = generateInviteCode();
    const couple = await prisma.couple.create({
      data: {
        inviteCode,
        status: "active",
        startedAt: new Date(),
        members: {
          create: [
            { userId, genderRole: myRole },
            { userId: partner.id, genderRole: partnerRole },
          ],
        },
      },
    });

    return NextResponse.json({ ok: true, coupleId: couple.id });
  } catch (err) {
    console.error("demo couple failed", err);
    return NextResponse.json({ error: "Не удалось открыть демо" }, { status: 500 });
  }
}
