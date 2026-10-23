import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JoinClient } from "./join-client";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const inviteCode = code.trim().toUpperCase();
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/register?next=${encodeURIComponent(`/join/${inviteCode}`)}`);
  }

  const membership = await prisma.coupleMember.findUnique({
    where: { userId: session.user.id },
    include: { couple: true },
  });
  if (membership?.couple.status === "active") redirect("/home");
  if (membership) redirect("/waiting");

  const couple = await prisma.couple.findUnique({
    where: { inviteCode },
    include: { members: true },
  });

  return (
    <JoinClient
      inviteCode={inviteCode}
      found={Boolean(couple)}
      takenRole={couple?.members[0]?.genderRole ?? null}
      full={Boolean(couple && couple.members.length >= 2)}
    />
  );
}
