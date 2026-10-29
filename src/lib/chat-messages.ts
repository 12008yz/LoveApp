import { z } from "zod";
import { CHAT_REACTIONS } from "@/lib/constants";

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

export type AggregatedReaction = { emoji: string; count: number; me: boolean };

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
    },
  },
  reactions: { select: { emoji: true, userId: true } },
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
  } | null;
  reactions?: { emoji: string; userId: string }[] | null;
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

export function toMessageDto(message: MessageWithRelations, me: string): MessageDto {
  return {
    id: message.id,
    coupleId: message.coupleId,
    authorId: message.authorId,
    body: message.body,
    readAt: iso(message.readAt),
    createdAt: iso(message.createdAt) as string,
    editedAt: iso(message.editedAt),
    replyToId: message.replyToId ?? null,
    quoteText: message.quoteText ?? null,
    author: {
      id: message.author.id,
      displayName: message.author.displayName,
      avatarPath: message.author.avatarPath ?? null,
    },
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          body: truncateReplyPreview(message.replyTo.body),
          authorId: message.replyTo.authorId,
          author: { displayName: message.replyTo.author?.displayName ?? "" },
        }
      : null,
    reactions: aggregateReactions(message.reactions ?? [], me),
  };
}
