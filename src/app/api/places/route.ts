import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export async function GET() {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const places = await prisma.place.findMany({
    where: { coupleId: authResult.couple.id },
    orderBy: { createdAt: "desc" },
    include: { media: { take: 3, orderBy: { createdAt: "desc" } } },
  });

  return NextResponse.json({ places });
}

const schema = z.object({
  name: z.string().min(1).max(120),
  address: z.string().max(300).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  notes: z.string().max(1000).optional(),
  visitAt: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте место и время" }, { status: 400 });
  }

  const visitAt = parsed.data.visitAt ? new Date(parsed.data.visitAt) : null;
  if (visitAt && Number.isNaN(visitAt.getTime())) {
    return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  }

  const place = await prisma.place.create({
    data: {
      coupleId: authResult.couple.id,
      name: parsed.data.name.trim(),
      address: parsed.data.address?.trim() || null,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      notes: parsed.data.notes?.trim() || null,
      visitAt,
    },
  });

  return NextResponse.json({ place }, { status: 201 });
}
