import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReportClient from "@/components/ReportClient";
import SiteShell from "@/components/SiteShell";
import { isMailEnabled } from "@/lib/mail";
import { isSmsEnabled, maskPhone } from "@/lib/sms";
import { getReport, getSavedParts } from "@/lib/orders";
import { BRAND, BUSINESS, REPORT_VALID_DAYS } from "@/lib/product";

export const dynamic = "force-dynamic";

// 개인 감정서는 검색에 노출하지 않는다.
export const metadata: Metadata = { title: `내 감정서 — ${BRAND.name}`, robots: { index: false, follow: false } };

type Params = Promise<{ token: string }>;
type Search = Promise<{ new?: string }>;

export default async function ReportPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { token } = await params;
  const { new: fresh } = await searchParams;
  const report = await getReport(token);
  if (!report) notFound();
  if (report.expired) {
    const contact = [BUSINESS.phone, BUSINESS.email].filter(Boolean).join(" / ");
    return (
      <SiteShell>
        <section className="card pay-result">
          <h2>감정서 열람 기간이 지났습니다</h2>
          <p>감정서는 결제일로부터 {REPORT_VALID_DAYS}일 동안 열 수 있습니다.</p>
          <p className="muted">
            주문번호 {report.order.id}
            {contact ? ` · 문의: ${contact}` : ""}
          </p>
          <a className="btn-secondary link-btn" href="/">처음으로</a>
        </section>
      </SiteShell>
    );
  }
  const saved = await getSavedParts(token, report.product.parts);
  return (
    <SiteShell>
      <ReportClient
        token={token}
        partKeys={report.product.parts}
        productName={report.product.name}
        expiresAt={report.expiresAt}
        chart={report.chart}
        initialParts={saved}
        justPaid={fresh === "1"}
        sendTo={
          [
            isMailEnabled() && report.order.email ? report.order.email : null,
            isSmsEnabled() && report.order.phone ? `휴대폰 ${maskPhone(report.order.phone)}` : null,
          ]
            .filter(Boolean)
            .join(", ") || null
        }
        orderId={report.order.id}
      />
    </SiteShell>
  );
}
