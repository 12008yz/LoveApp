import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/invite";

const DEMO_PASSWORD = "demo1234";

/**
 * One-tap demo: create a guest user + active couple with a placeholder partner,
 * then return credentials for client-side signIn.
 */
export async function POST() {
  try {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 8);
    // Guest uses example.com (passes Auth.js/zod). Partner stays @loveapp.local
    // so demo detection + DELETE cleanup match /api/couple/demo.
    const email = `guest.${nanoid(8)}@example.com`;
    const partnerEmail = `demo+${nanoid(10)}@loveapp.local`;

    const couple = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          displayName: "Гость",
          passwordHash,
        },
      });
      const partner = await tx.user.create({
        data: {
          email: partnerEmail,
          displayName: "Демо-партнёр",
          passwordHash: await bcrypt.hash(nanoid(24), 8),
        },
      });
      return tx.couple.create({
        data: {
          inviteCode: generateInviteCode(),
          status: "active",
          startedAt: new Date(),
          members: {
            create: [
              { userId: user.id, genderRole: "boy" },
              { userId: partner.id, genderRole: "girl" },
            ],
          },
        },
      });
    });

    return NextResponse.json({
      ok: true,
      email,
      password: DEMO_PASSWORD,
      coupleId: couple.id,
    });
  } catch (err) {
    console.error("demo auth failed", err);
    return NextResponse.json(
      { error: "Не удалось открыть демо. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
