import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateInviteCode } from "@/lib/invite";
import { presentLetter } from "@/lib/letters";

const prisma = new PrismaClient();

describe("couple data isolation (db)", () => {
  const stamp = Date.now();
  let coupleA = "";
  let coupleB = "";
  let userA1 = "";
  let userB1 = "";

  beforeAll(async () => {
    const hash = await bcrypt.hash("secret12", 4);

    const a1 = await prisma.user.create({
      data: {
        email: `a1_${stamp}@test.local`,
        displayName: "A1",
        passwordHash: hash,
      },
    });
    const a2 = await prisma.user.create({
      data: {
        email: `a2_${stamp}@test.local`,
        displayName: "A2",
        passwordHash: hash,
      },
    });
    const b1 = await prisma.user.create({
      data: {
        email: `b1_${stamp}@test.local`,
        displayName: "B1",
        passwordHash: hash,
      },
    });
    const b2 = await prisma.user.create({
      data: {
        email: `b2_${stamp}@test.local`,
        displayName: "B2",
        passwordHash: hash,
      },
    });
    userA1 = a1.id;
    userB1 = b1.id;

    const cA = await prisma.couple.create({
      data: {
        inviteCode: generateInviteCode(),
        status: "active",
        members: {
          create: [
            { userId: a1.id, genderRole: "boy" },
            { userId: a2.id, genderRole: "girl" },
          ],
        },
      },
    });
    const cB = await prisma.couple.create({
      data: {
        inviteCode: generateInviteCode(),
        status: "active",
        members: {
          create: [
            { userId: b1.id, genderRole: "boy" },
            { userId: b2.id, genderRole: "girl" },
          ],
        },
      },
    });
    coupleA = cA.id;
    coupleB = cB.id;

    await prisma.message.create({
      data: { coupleId: coupleA, authorId: a1.id, body: "only for couple A" },
    });
    await prisma.message.create({
      data: { coupleId: coupleB, authorId: b1.id, body: "only for couple B" },
    });
  });

  afterAll(async () => {
    await prisma.couple.deleteMany({ where: { id: { in: [coupleA, coupleB] } } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `_${stamp}@test.local` } },
    });
    await prisma.$disconnect();
  });

  it("returns only own couple messages", async () => {
    const forA = await prisma.message.findMany({ where: { coupleId: coupleA } });
    const forB = await prisma.message.findMany({ where: { coupleId: coupleB } });
    expect(forA.every((m) => m.body.includes("couple A"))).toBe(true);
    expect(forB.every((m) => m.body.includes("couple B"))).toBe(true);
    expect(forA.some((m) => m.authorId === userB1)).toBe(false);
  });

  it("enforces unique gender roles in a couple", async () => {
    const outsider = await prisma.user.create({
      data: {
        email: `out_${stamp}@test.local`,
        displayName: "Out",
        passwordHash: await bcrypt.hash("secret12", 4),
      },
    });
    await expect(
      prisma.coupleMember.create({
        data: { coupleId: coupleA, userId: outsider.id, genderRole: "boy" },
      }),
    ).rejects.toThrow();
  });

  it("keeps letter body private until unlock for partner", async () => {
    const letter = await prisma.letter.create({
      data: {
        coupleId: coupleA,
        authorId: userA1,
        title: "Later",
        body: "hidden",
        unlockAt: new Date("2099-01-01"),
      },
    });
    const partnerView = presentLetter(letter, "someone-else", new Date());
    expect(partnerView.body).toBe("");
    expect(partnerView.canRead).toBe(false);
  });
});
