import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReportClient from "@/components/ReportClient";
import SiteShell from "@/components/SiteShell";
import { isMailEnabled } from "@/lib/mail";
import { isKakaoEnabled, isSmsEnabled, maskPhone, phoneChannels } from "@/lib/sms";
import { webRevealMinutes } from "@/lib/delivery";
import { getReport, getSavedParts } from "@/lib/orders";
import { BRAND, BUSINESS, REPORT_VALID_DAYS } from "@/lib/product";

export const dynamic = "force-dynamic";

// 개인 감정서는 검색에 노출하지 않는다.
export const metadata: Metadata = { title: `내 감정서 — ${BRAND.name}`, robots: { index: false, follow: false } };

type Params = Promise<{ token: string }>;
type Search = Promise<{ new?: string; render?: string }>;

export default async function ReportPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { token } = await params;
  const { new: fresh, render } = await searchParams;
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
            isMailEnabled() && report.order.email && (!report.order.notify || report.order.notify.includes("email")) ? report.order.email : null,
            isSmsEnabled() && report.order.phone && phoneChannels(report.order).length
              ? `${phoneChannels(report.order)
                  .filter((c) => c === "sms" || isKakaoEnabled())
                  .map((c) => (c === "kakao" ? "카카오톡" : "문자"))
                  .join("·") || "문자"} ${maskPhone(report.order.phone)}`
              : null,
          ]
            .filter(Boolean)
            .join(", ") || null
        }
        orderId={report.order.id}
        deliverAt={report.order.deliverAt ?? null}
        // 결제 뒤 몇 분(기본 3분)이 지나야 화면에 감정서를 펼친다. 파일 만들기(render=1)는 기다리지 않는다.
        revealInMs={
          render === "1"
            ? 0
            : Math.max(0, new Date(report.order.paidAt ?? report.order.createdAt).getTime() + webRevealMinutes() * 60_000 - Date.now())
        }
      />
    </SiteShell>
  );
}
