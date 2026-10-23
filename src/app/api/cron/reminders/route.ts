import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { isCronAuthorized } from "@/lib/cron-auth";

async function runReminders() {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      remindAt: { lte: now },
      remindedAt: null,
    },
    take: 50,
    include: {
      couple: { include: { members: true } },
    },
  });

  let notified = 0;
  for (const event of events) {
    const title = "Напоминание LoveApp";
    const body = `Скоро: ${event.title}`;
    const url = "/calendar";
    for (const member of event.couple.members) {
      const res = await sendPushToUser(member.userId, { title, body, url });
      notified += res.sent;
    }
    await prisma.event.update({
      where: { id: event.id },
      data: { remindedAt: now },
    });
  }

  return { events: events.length, notified };
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await runReminders();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: Request) {
  return GET(req);
}
