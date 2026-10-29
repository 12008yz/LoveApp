import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { MESSAGE_INCLUDE, toMessageDto } from "@/lib/chat-messages";

function bodyFilter(q: string) {
  const url = process.env.DATABASE_URL || "";
  const isPostgres = url.startsWith("postgresql:") || url.startsWith("postgres:");
  if (isPostgres) {
    return { contains: q, mode: "insensitive" as const };
  }
  return { contains: q };
}

export async function GET(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await prisma.message.findMany({
    where: {
      coupleId: authResult.couple.id,
      body: bodyFilter(q),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: MESSAGE_INCLUDE,
  });

  // Intentionally do NOT mark messages as read.

  return NextResponse.json({
    messages: messages.map((m) => toMessageDto(m, authResult.user.id)),
  });
}
