import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { notifyPartner } from "@/lib/push";
import { clearTyping } from "@/lib/chat-typing";
import {
  MESSAGE_INCLUDE,
  postMessageSchema,
  pushPreviewForMessage,
  toMessageDto,
} from "@/lib/chat-messages";

export async function GET(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");

  const [messages, couple] = await Promise.all([
    prisma.message.findMany({
      where: {
        coupleId: authResult.couple.id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: after ? 100 : 200,
      include: MESSAGE_INCLUDE,
    }),
    prisma.couple.findUnique({
      where: { id: authResult.couple.id },
      select: { pinnedMessageId: true },
    }),
  ]);

  await prisma.message.updateMany({
    where: {
      coupleId: authResult.couple.id,
      authorId: { not: authResult.user.id },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const pinnedMessageId = couple?.pinnedMessageId ?? null;
  let pinnedPreview: { id: string; body: string; authorName: string } | null = null;
  if (pinnedMessageId) {
    const inList = messages.find((m) => m.id === pinnedMessageId);
    if (inList) {
      pinnedPreview = {
        id: inList.id,
        body: pushPreviewForMessage(inList.body, inList.attachments),
        authorName: inList.author.displayName,
      };
    } else {
      const pinned = await prisma.message.findFirst({
        where: { id: pinnedMessageId, coupleId: authResult.couple.id },
        select: {
          id: true,
          body: true,
          author: { select: { displayName: true } },
          attachments: { select: { kind: true }, orderBy: { sortOrder: "asc" } },
        },
      });
      if (pinned) {
        pinnedPreview = {
          id: pinned.id,
          body: pushPreviewForMessage(pinned.body, pinned.attachments),
          authorName: pinned.author.displayName,
        };
      }
    }
  }

  return NextResponse.json({
    messages: messages.map((m) => toMessageDto(m, authResult.user.id)),
    pinnedMessageId,
    pinnedPreview,
  });
}

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const json = await req.json().catch(() => null);
  const parsed = postMessageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректное сообщение" }, { status: 400 });
  }

  const body = parsed.data.body.trim();
  if (!body) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  if (parsed.data.replyToId) {
    const reply = await prisma.message.findFirst({
      where: { id: parsed.data.replyToId, coupleId: authResult.couple.id },
      select: { id: true },
    });
    if (!reply) {
      return NextResponse.json({ error: "Сообщение для ответа не найдено" }, { status: 404 });
    }
  }

  const message = await prisma.message.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      body,
      replyToId: parsed.data.replyToId,
      quoteText: parsed.data.quoteText?.trim() || null,
    },
    include: MESSAGE_INCLUDE,
  });

  clearTyping(authResult.couple.id, authResult.user.id);

  void notifyPartner(authResult.couple.id, authResult.user.id, {
    title: message.author.displayName,
    body: pushPreviewForMessage(body, message.attachments),
    url: "/chat",
  });

  return NextResponse.json(
    { message: toMessageDto(message, authResult.user.id) },
    { status: 201 },
  );
}
