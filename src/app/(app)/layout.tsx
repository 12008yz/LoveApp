import { AppShell } from "@/components/app-shell";
import { requireUser, getMembership } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function CoupleAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership) redirect("/onboarding");
  if (membership.couple.status !== "active") redirect("/waiting");

  const names = membership.couple.members
    .map((m) => m.user.displayName)
    .join(" & ");

  return <AppShell coupleLabel={names}>{children}</AppShell>;
}
