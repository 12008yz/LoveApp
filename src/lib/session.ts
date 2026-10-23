import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export async function getMembership(userId: string) {
  return prisma.coupleMember.findUnique({
    where: { userId },
    include: {
      couple: {
        include: {
          members: {
            include: { user: { select: { id: true, displayName: true, email: true } } },
          },
        },
      },
      user: { select: { id: true, displayName: true, email: true } },
    },
  });
}

export async function requireCouple() {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership) redirect("/onboarding");
  if (membership.couple.status !== "active") redirect("/waiting");
  return { user, membership, couple: membership.couple };
}

export async function requireUserApi() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user: session.user };
}

export async function requireCoupleApi() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const membership = await getMembership(session.user.id);
  if (!membership || membership.couple.status !== "active") {
    return { error: Response.json({ error: "Couple required" }, { status: 403 }) };
  }
  return { user: session.user, membership, couple: membership.couple };
}
