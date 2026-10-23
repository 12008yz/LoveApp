import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const items = await prisma.wishlistItem.findMany({
    where: { coupleId: authResult.couple.id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ items });
}

const schema = z.object({
  title: z.string().min(1).max(160),
  url: z.string().optional(),
  notes: z.string().max(1000).optional(),
  forPartner: z.boolean().optional(),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте желание" }, { status: 400 });
  }

  const url = parsed.data.url?.trim() || "";
  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "Ссылка должна начинаться с http(s)://" }, { status: 400 });
  }

  const item = await prisma.wishlistItem.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      title: parsed.data.title.trim(),
      url: url || null,
      notes: parsed.data.notes?.trim() || null,
      forPartner: parsed.data.forPartner ?? true,
    },
    include: { author: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({ item }, { status: 201 });
}
