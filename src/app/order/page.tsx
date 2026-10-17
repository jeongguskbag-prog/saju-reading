import type { Metadata } from "next";
import OrderLookup from "@/components/OrderLookup";
import SiteShell from "@/components/SiteShell";
import { SupportBox } from "@/components/SupportLinks";
import { BRAND } from "@/lib/product";

export const metadata: Metadata = { title: `주문 조회 — ${BRAND.name}`, robots: { index: false, follow: false } };

export default function OrderPage() {
  return (
    <SiteShell>
      <OrderLookup />
      <SupportBox compact />
    </SiteShell>
  );
}
