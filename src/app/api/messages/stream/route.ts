import { prisma } from "@/lib/prisma";
import { requireCoupleApi } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authResult = await requireCoupleApi();
  if ("error" in authResult) return authResult.error;

  const { couple, user } = authResult;
  const encoder = new TextEncoder();
  let lastCheck = new Date();
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
          const messages = await prisma.message.findMany({
            where: {
              coupleId: couple.id,
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, displayName: true, avatarPath: true } },
            },
          });
          if (messages.length) {
            lastCheck = messages[messages.length - 1].createdAt;
            send({ type: "messages", messages });
            await prisma.message.updateMany({
              where: {
                coupleId: couple.id,
                authorId: { not: user.id },
                readAt: null,
              },
              data: { readAt: new Date() },
            });
          } else {
            send({ type: "ping" });
          }
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
