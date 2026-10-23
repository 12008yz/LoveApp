import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const items = await prisma.careItem.findMany({
    where: {
      coupleId: authResult.couple.id,
      OR: [
        { authorId: authResult.user.id },
        { visibility: "shared" },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ items });
}

const schema = z.object({
  kind: z.enum(["joy", "annoyance"]),
  body: z.string().min(1).max(1000),
  visibility: z.enum(["private", "shared"]).default("private"),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте запись" }, { status: 400 });
  }

  const item = await prisma.careItem.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      kind: parsed.data.kind,
      body: parsed.data.body.trim(),
      visibility: parsed.data.visibility,
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ item }, { status: 201 });
}
