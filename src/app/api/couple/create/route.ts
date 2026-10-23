import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/session";
import { generateInviteCode } from "@/lib/invite";

const schema = z.object({
  genderRole: z.enum(["boy", "girl"]),
  startedAt: z.string().optional().nullable(),
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
    return NextResponse.json({ error: "Выберите роль" }, { status: 400 });
  }

  let startedAt: Date | null = null;
  if (parsed.data.startedAt) {
    const parsedDate = new Date(parsed.data.startedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
    }
    startedAt = parsedDate;
  }

  const inviteCode = generateInviteCode();
  const couple = await prisma.couple.create({
    data: {
      inviteCode,
      status: "waiting",
      startedAt,
      members: {
        create: {
          userId: authResult.user.id,
          genderRole: parsed.data.genderRole,
        },
      },
    },
  });

  return NextResponse.json({ coupleId: couple.id, inviteCode: couple.inviteCode });
}
