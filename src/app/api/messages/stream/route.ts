import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";
import { MESSAGE_INCLUDE, aggregateReactions, toMessageDto } from "@/lib/chat-messages";
import { getPartnerTyping } from "@/lib/chat-typing";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const { couple, user } = authResult;
  const partnerMember = couple.members.find((m) => m.userId !== user.id);
  const partnerId = partnerMember?.userId;

  const encoder = new TextEncoder();
  let lastCheck = new Date();
  let lastReadCheck = new Date();
  let lastEditCheck = new Date();
  let lastReactionCheck = new Date();
  let lastReactionsBump = new Date();
  let lastPin: string | null | undefined = undefined;
  let lastPartnerSeen: string | null | undefined = undefined;
  let lastTypingActive = false;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected" });

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          let emitted = false;

          const messages = await prisma.message.findMany({
            where: {
              coupleId: couple.id,
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: "asc" },
            include: MESSAGE_INCLUDE,
          });
          if (messages.length) {
            lastCheck = messages[messages.length - 1].createdAt;
            send({
              type: "messages",
              messages: messages.map((m) => toMessageDto(m, user.id)),
            });
            emitted = true;
            await prisma.message.updateMany({
              where: {
                coupleId: couple.id,
                authorId: { not: user.id },
                readAt: null,
              },
              data: { readAt: new Date() },
            });
          }

          const edits = await prisma.message.findMany({
            where: {
              coupleId: couple.id,
              editedAt: { gt: lastEditCheck, not: null },
            },
            orderBy: { editedAt: "asc" },
            include: MESSAGE_INCLUDE,
          });
          if (edits.length) {
            const last = edits[edits.length - 1]?.editedAt;
            if (last) lastEditCheck = last;
            send({
              type: "message_updated",
              messages: edits.map((m) => toMessageDto(m, user.id)),
            });
            emitted = true;
          }

          const reads = await prisma.message.findMany({
            where: {
              coupleId: couple.id,
              authorId: user.id,
              readAt: { gt: lastReadCheck },
            },
            orderBy: { readAt: "asc" },
            select: { id: true, readAt: true },
          });
          if (reads.length) {
            const last = reads[reads.length - 1]?.readAt;
            if (last) lastReadCheck = last;
            send({ type: "reads", reads });
            emitted = true;
          }

          const reactionRows = await prisma.messageReaction.findMany({
            where: {
              updatedAt: { gt: lastReactionCheck },
              message: { coupleId: couple.id },
            },
            orderBy: { updatedAt: "asc" },
            select: { messageId: true, updatedAt: true },
          });
          const bumped = await prisma.message.findMany({
            where: {
              coupleId: couple.id,
              reactionsUpdatedAt: { gt: lastReactionsBump, not: null },
            },
            orderBy: { reactionsUpdatedAt: "asc" },
            select: { id: true, reactionsUpdatedAt: true },
          });
          const reactionIds = new Set<string>([
            ...reactionRows.map((r) => r.messageId),
            ...bumped.map((m) => m.id),
          ]);
          if (reactionRows.length) {
            lastReactionCheck = reactionRows[reactionRows.length - 1].updatedAt;
          }
          if (bumped.length) {
            const last = bumped[bumped.length - 1]?.reactionsUpdatedAt;
            if (last) lastReactionsBump = last;
          }
          if (reactionIds.size) {
            for (const messageId of reactionIds) {
              const rows = await prisma.messageReaction.findMany({
                where: { messageId },
                select: { emoji: true, userId: true },
              });
              send({
                type: "reaction",
                messageId,
                reactions: aggregateReactions(rows, user.id),
              });
            }
            emitted = true;
          }

          const coupleRow = await prisma.couple.findUnique({
            where: { id: couple.id },
            select: { pinnedMessageId: true },
          });
          const pinId = coupleRow?.pinnedMessageId ?? null;
          if (lastPin === undefined || lastPin !== pinId) {
            lastPin = pinId;
            send({ type: "pin", messageId: pinId });
            emitted = true;
          }

          if (partnerId) {
            const partner = await prisma.user.findUnique({
              where: { id: partnerId },
              select: { lastSeenAt: true },
            });
            const seen = partner?.lastSeenAt?.toISOString() ?? null;
            if (lastPartnerSeen === undefined || lastPartnerSeen !== seen) {
              lastPartnerSeen = seen;
              send({ type: "presence", userId: partnerId, lastSeenAt: seen });
              emitted = true;
            }

            const typing = getPartnerTyping(couple.id, user.id);
            const active = Boolean(typing);
            if (active !== lastTypingActive) {
              lastTypingActive = active;
              send({
                type: "typing",
                userId: typing?.userId ?? partnerId,
                active,
              });
              emitted = true;
            }
          }

          if (!emitted) send({ type: "ping" });
        } catch {
          // keep stream alive
        }
      }, 1500);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* noop */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
