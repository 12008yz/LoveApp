import { redirect } from "next/navigation";
import { requireUser, getMembership } from "@/lib/session";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (membership?.couple.status === "active") redirect("/home");
  if (membership) redirect("/waiting");

  return <OnboardingClient />;
}
