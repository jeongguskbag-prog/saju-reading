import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReportClient from "@/components/ReportClient";
import SiteShell from "@/components/SiteShell";
import { isMailEnabled } from "@/lib/mail";
import { getReport, getSavedParts } from "@/lib/orders";
import { BRAND } from "@/lib/product";
import { PART_KEYS } from "@/lib/report-shared";

export const dynamic = "force-dynamic";

// 개인 리포트는 검색에 노출하지 않는다.
export const metadata: Metadata = { title: `내 리포트 — ${BRAND.name}`, robots: { index: false, follow: false } };

type Params = Promise<{ token: string }>;
type Search = Promise<{ new?: string }>;

export default async function ReportPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { token } = await params;
  const { new: fresh } = await searchParams;
  const report = await getReport(token);
  if (!report) notFound();
  const saved = await getSavedParts(token, PART_KEYS);
  return (
    <SiteShell>
      <ReportClient
        token={token}
        chart={report.chart}
        initialParts={saved}
        justPaid={fresh === "1"}
        email={report.order.email}
        mailEnabled={isMailEnabled()}
        orderId={report.order.id}
      />
    </SiteShell>
  );
}
