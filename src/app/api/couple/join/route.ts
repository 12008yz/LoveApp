import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";

const schema = z.object({
  inviteCode: z.string().min(4).max(16),
  genderRole: z.enum(["boy", "girl"]),
});

export async function POST(req: Request) {
  const authResult = await requireUserApi();
  if ("error" in authResult) return authResult.error;

  const existing = await prisma.coupleMember.findUnique({
    where: { userId: authResult.user.id },
  });
  if (existing) {
    return NextResponse.json({ error: "Вы уже в паре" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const code = parsed.data.inviteCode.trim().toUpperCase();
  const couple = await prisma.couple.findUnique({
    where: { inviteCode: code },
    include: { members: true },
  });

  if (!couple) {
    return NextResponse.json({ error: "Код не найден" }, { status: 404 });
  }
  if (couple.members.length >= 2) {
    return NextResponse.json({ error: "Пара уже заполнена" }, { status: 400 });
  }

  const takenRole = couple.members[0]?.genderRole;
  if (takenRole === parsed.data.genderRole) {
    return NextResponse.json(
      { error: `Роль «${parsed.data.genderRole === "boy" ? "мальчик" : "девочка"}» уже занята` },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.coupleMember.create({
      data: {
        coupleId: couple.id,
        userId: authResult.user.id,
        genderRole: parsed.data.genderRole,
      },
    }),
    prisma.couple.update({
      where: { id: couple.id },
      data: { status: "active" },
    }),
  ]);

  return NextResponse.json({ ok: true, coupleId: couple.id });
}
