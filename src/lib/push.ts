import webpush from "web-push";
import { isOnline } from "@/lib/chat-presence";
import { prisma } from "@/lib/prisma";

function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
}

function setup() {
  if (!configured()) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!.trim(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type SendPushResult = {
  sent: number;
  reason?: "not_configured" | "no_subscriptions" | "all_failed" | "ok" | "partner_in_chat";
  lastError?: string;
};

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<SendPushResult> {
  if (!setup()) return { sent: 0, reason: "not_configured" };

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (!subs.length) return { sent: 0, reason: "no_subscriptions" };

  let sent = 0;
  let lastError: string | undefined;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
      );
      sent += 1;
    } catch (err: unknown) {
      const status =
        typeof err === "object" && err && "statusCode" in err
          ? Number((err as { statusCode: number }).statusCode)
          : 0;
      lastError = err instanceof Error ? err.message : `push failed (${status || "unknown"})`;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }
  if (sent > 0) return { sent, reason: "ok" };
  return { sent: 0, reason: "all_failed", lastError };
}

export async function notifyPartner(
  coupleId: string,
  authorId: string,
  payload: PushPayload,
): Promise<SendPushResult> {
  const partner = await prisma.coupleMember.findFirst({
    where: { coupleId, userId: { not: authorId } },
    include: { user: { select: { lastSeenAt: true } } },
  });
  if (!partner) return { sent: 0 };
  // Presence heartbeats only run while the partner is on /chat — skip push then.
  if (isOnline(partner.user.lastSeenAt)) {
    return { sent: 0, reason: "partner_in_chat" };
  }
  return sendPushToUser(partner.userId, payload);
}
