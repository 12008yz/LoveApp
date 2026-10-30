import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { notifyPartner } from "@/lib/push";
import { clearTyping } from "@/lib/chat-typing";
import { classifyUpload, saveUpload } from "@/lib/storage";
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_MEDIA_MAX_FILES,
  CHAT_VIDEO_MAX_BYTES,
  MESSAGE_INCLUDE,
  pushPreviewForMessage,
  toMessageDto,
} from "@/lib/chat-messages";

function collectFiles(form: FormData): File[] {
  const out: File[] = [];
  for (const [key, value] of form.entries()) {
    if (!(value instanceof File) || value.size <= 0) continue;
    if (key === "files" || key === "files[]" || key === "file") {
      out.push(value);
    }
  }
  return out;
}

export async function POST(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const files = collectFiles(form);
  if (files.length === 0) {
    return NextResponse.json({ error: "Добавьте фото или видео" }, { status: 400 });
  }
  if (files.length > CHAT_MEDIA_MAX_FILES) {
    return NextResponse.json(
      { error: `Максимум ${CHAT_MEDIA_MAX_FILES} файлов` },
      { status: 400 },
    );
  }

  const caption = String(form.get("caption") || form.get("body") || "")
    .trim()
    .slice(0, 4000);
  const replyToId = String(form.get("replyToId") || "") || undefined;
  const quoteTextRaw = String(form.get("quoteText") || "").trim().slice(0, 500);
  const quoteText = quoteTextRaw || undefined;

  if (quoteText && !replyToId) {
    return NextResponse.json({ error: "Цитата только с ответом" }, { status: 400 });
  }

  if (replyToId) {
    const reply = await prisma.message.findFirst({
      where: { id: replyToId, coupleId: authResult.couple.id },
      select: { id: true },
    });
    if (!reply) {
      return NextResponse.json({ error: "Сообщение для ответа не найдено" }, { status: 404 });
    }
  }

  const prepared: {
    kind: "image" | "video";
    file: File;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    sortOrder: number;
  }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const kind = classifyUpload(file);
    if (!kind) {
      return NextResponse.json(
        { error: "Только изображения и видео" },
        { status: 400 },
      );
    }
    const max = kind === "image" ? CHAT_IMAGE_MAX_BYTES : CHAT_VIDEO_MAX_BYTES;
    if (file.size > max) {
      return NextResponse.json(
        {
          error:
            kind === "image"
              ? "Фото максимум 5 МБ"
              : "Видео максимум 25 МБ",
        },
        { status: 400 },
      );
    }
    const filePath = await saveUpload(file, kind);
    prepared.push({
      kind,
      file,
      filePath,
      mimeType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
      sizeBytes: file.size,
      sortOrder: i,
    });
  }

  const message = await prisma.message.create({
    data: {
      coupleId: authResult.couple.id,
      authorId: authResult.user.id,
      body: caption,
      replyToId,
      quoteText: quoteText || null,
      attachments: {
        create: prepared.map((p) => ({
          kind: p.kind,
          filePath: p.filePath,
          mimeType: p.mimeType,
          sizeBytes: p.sizeBytes,
          sortOrder: p.sortOrder,
        })),
      },
    },
    include: MESSAGE_INCLUDE,
  });

  clearTyping(authResult.couple.id, authResult.user.id);

  void notifyPartner(authResult.couple.id, authResult.user.id, {
    title: message.author.displayName,
    body: pushPreviewForMessage(
      message.body,
      message.attachments.map((a) => ({ kind: a.kind })),
    ),
    url: "/chat",
  });

  return NextResponse.json(
    { message: toMessageDto(message, authResult.user.id) },
    { status: 201 },
  );
}
