import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { DEMO_COUPLE_ID, DEMO_USER, isDemoMode } from "@/lib/demo-mode";
import { prisma } from "@/lib/prisma";
import { generateInviteCode } from "@/lib/invite";

/**
 * One-tap demo login.
 * On Layero (DEMO_MODE) — no database: fixed guest credentials + in-memory couple.
 * Locally — creates a real guest user + couple in SQLite/Postgres.
 */
export async function POST() {
  if (isDemoMode()) {
    return NextResponse.json({
      ok: true,
      email: DEMO_USER.email,
      password: DEMO_USER.password,
      coupleId: DEMO_COUPLE_ID,
      demoMode: true,
    });
  }

  try {
    const password = "demo1234";
    const passwordHash = await bcrypt.hash(password, 8);
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
      password,
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
