import { redirect } from "next/navigation";
import { requireUser, getMembership } from "@/lib/session";
import { WaitingClient } from "./waiting-client";

export default async function WaitingPage() {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership) redirect("/onboarding");
  if (membership.couple.status === "active") redirect("/home");

  return (
    <WaitingClient
      inviteCode={membership.couple.inviteCode}
      role={membership.genderRole}
    />
  );
}
