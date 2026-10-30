import { z } from "zod";
import { CHAT_REACTIONS } from "@/lib/constants";
import { stickerPreviewLabel } from "@/lib/stickers";

export const postMessageSchema = z
  .object({
    body: z.string().min(1).max(4000),
    replyToId: z.string().min(1).optional(),
    quoteText: z.string().min(1).max(500).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.quoteText && !val.replyToId) {
      ctx.addIssue({ code: "custom", message: "quote requires replyToId", path: ["quoteText"] });
    }
  });

export const patchMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const reactionSchema = z.object({
  emoji: z.enum(CHAT_REACTIONS as unknown as [string, ...string[]]),
});

export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CHAT_VIDEO_MAX_BYTES = 25 * 1024 * 1024;
export const CHAT_MEDIA_MAX_FILES = 10;

export type AggregatedReaction = { emoji: string; count: number; me: boolean };

export type AttachmentDto = {
  id: string;
  kind: "image" | "video";
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
};

/** Group reaction rows by emoji (first-seen order), flagging the viewer's own. */
export function aggregateReactions(
  rows: { emoji: string; userId: string }[],
  me: string,
): AggregatedReaction[] {
  const map = new Map<string, AggregatedReaction>();
  for (const row of rows) {
    const cur = map.get(row.emoji) ?? { emoji: row.emoji, count: 0, me: false };
    cur.count += 1;
    if (row.userId === me) cur.me = true;
    map.set(row.emoji, cur);
  }
  return [...map.values()];
}

/** Prisma include used everywhere a message is read for the chat API. */
export const MESSAGE_INCLUDE = {
  author: { select: { id: true, displayName: true, avatarPath: true } },
  replyTo: {
    select: {
      id: true,
      body: true,
      authorId: true,
      author: { select: { id: true, displayName: true } },
      attachments: {
        select: { kind: true },
        orderBy: { sortOrder: "asc" as const },
        take: 10,
      },
    },
  },
  reactions: { select: { emoji: true, userId: true } },
  attachments: {
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

export type MessageDto = {
  id: string;
  coupleId: string;
  authorId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  editedAt: string | null;
  replyToId: string | null;
  quoteText: string | null;
  author: { id: string; displayName: string; avatarPath: string | null };
  replyTo: {
    id: string;
    body: string;
    authorId: string;
    author: { displayName: string };
  } | null;
  reactions: AggregatedReaction[];
  attachments: AttachmentDto[];
};

type DateLike = Date | string | null | undefined;

/** Structural shape of a message loaded with MESSAGE_INCLUDE. */
export type MessageWithRelations = {
  id: string;
  coupleId: string;
  authorId: string;
  body: string;
  readAt?: DateLike;
  createdAt: Date | string;
  editedAt?: DateLike;
  replyToId?: string | null;
  quoteText?: string | null;
  author: { id: string; displayName: string; avatarPath: string | null };
  replyTo?: {
    id: string;
    body: string;
    authorId: string;
    author?: { id: string; displayName: string } | null;
    attachments?: { kind: string }[] | null;
  } | null;
  reactions?: { emoji: string; userId: string }[] | null;
  attachments?:
    | {
        id: string;
        kind: string;
        filePath: string;
        mimeType: string;
        sizeBytes: number;
        sortOrder: number;
      }[]
    | null;
};

function iso(value: DateLike): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** Spec: reply preview body truncated ~120 chars. */
export function truncateReplyPreview(body: string, max = 120): string {
  if (body.length <= max) return body;
  return `${body.slice(0, max - 1)}…`;
}

export function mediaPreviewLabel(
  attachments: { kind: string }[] | null | undefined,
): string {
  const list = attachments ?? [];
  if (list.length === 0) return "";
  if (list.length > 1) return `Альбом · ${list.length}`;
  return list[0].kind === "video" ? "Видео" : "Фото";
}

export function pushPreviewForMessage(
  body: string,
  attachments: { kind: string }[] | null | undefined,
): string {
  const trimmed = body.trim();
  if (trimmed) {
    const sticker = stickerPreviewLabel(trimmed);
    if (sticker) return sticker;
    return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
  }
  return mediaPreviewLabel(attachments) || "Сообщение";
}

function toAttachmentDto(
  row: {
    id: string;
    kind: string;
    filePath: string;
    mimeType: string;
    sizeBytes: number;
    sortOrder: number;
  },
): AttachmentDto {
  return {
    id: row.id,
    kind: row.kind === "video" ? "video" : "image",
    filePath: row.filePath,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sortOrder: row.sortOrder,
  };
}

export function toMessageDto(message: MessageWithRelations, me: string): MessageDto {
  const replyRaw = message.replyTo
    ? message.replyTo.body.trim() || mediaPreviewLabel(message.replyTo.attachments)
    : "";
  const replyBody = stickerPreviewLabel(replyRaw) ?? replyRaw;

  return {
    id: message.id,
    coupleId: message.coupleId,
    authorId: message.authorId,
    body: message.body,
    readAt: iso(message.readAt),
    createdAt: iso(message.createdAt) as string,
    editedAt: iso(message.editedAt),
    replyToId: message.replyToId ?? null,
    quoteText: message.quoteText
      ? stickerPreviewLabel(message.quoteText) ?? message.quoteText
      : null,
    author: {
      id: message.author.id,
      displayName: message.author.displayName,
      avatarPath: message.author.avatarPath ?? null,
    },
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          body: truncateReplyPreview(replyBody || "Сообщение"),
          authorId: message.replyTo.authorId,
          author: { displayName: message.replyTo.author?.displayName ?? "" },
        }
      : null,
    reactions: aggregateReactions(message.reactions ?? [], me),
    attachments: (message.attachments ?? []).map(toAttachmentDto),
  };
}
