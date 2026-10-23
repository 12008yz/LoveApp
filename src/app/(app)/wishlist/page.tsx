import { SectionHeader } from "@/components/section-header";
import { requireCouple } from "@/lib/session";
import { WishlistClient } from "./wishlist-client";

export default async function WishlistPage() {
  await requireCouple();
  return (
    <div>
      <SectionHeader title="Желания" subtitle="Идеи подарков и маленьких радостей." />
      <WishlistClient />
    </div>
  );
}
