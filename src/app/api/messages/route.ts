import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { notifyPartner } from "@/lib/push";

export async function GET(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");

  const messages = await prisma.message.findMany({
    where: {
      coupleId: authResult.couple.id,
      ...(after ? { createdAt: { gt: new Date(after) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: after ? 100 : 200,
    include: {
      author: { select: { id: true, displayName: true } },
    },
  });

  // Mark partner messages as read
  await prisma.message.updateMany({
    where: {
      coupleId: authResult.couple.id,
      authorId: { not: authResult.user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages });
}

const postSchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      body: parsed.data.body.trim(),
    },
    include: {
      author: { select: { id: true, displayName: true } },
    },
  });

  const preview =
    message.body.length > 80 ? `${message.body.slice(0, 77)}…` : message.body;
  void notifyPartner(authResult.couple.id, authResult.user.id, {
    title: message.author.displayName,
    body: preview,
    url: "/chat",
  });

  return NextResponse.json({ message }, { status: 201 });
}
