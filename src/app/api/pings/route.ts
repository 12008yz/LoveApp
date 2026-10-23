import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const pings = await prisma.moodPing.findMany({
    where: { coupleId: authResult.couple.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ pings });
}

const schema = z.object({
  kind: z.enum(["miss_you", "hug", "love", "busy", "tired", "happy"]),
  note: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Выберите пинг" }, { status: 400 });
  }

  const ping = await prisma.moodPing.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      kind: parsed.data.kind,
      note: parsed.data.note?.trim() || null,
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ ping }, { status: 201 });
}
