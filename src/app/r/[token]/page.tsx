import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { sendCompletionIfReady } from "@/lib/fulfill";
import { originFrom } from "@/lib/site";
import ReportClient from "@/components/ReportClient";
import SiteShell from "@/components/SiteShell";
import { isMailEnabled } from "@/lib/mail";
import { isKakaoEnabled, isSmsEnabled, maskPhone, phoneChannels } from "@/lib/sms";
import { canCustomerCancel, getReport, getSavedParts, isReleased, orderByToken, orderReleaseAt, renderSignature } from "@/lib/orders";
import { orderWaitLabel } from "@/lib/release";
import { getReviewByOrder } from "@/lib/reviews";
import { BRAND, BUSINESS, REPORT_VALID_DAYS, won } from "@/lib/product";

export const dynamic = "force-dynamic";

// 개인 감정서는 검색에 노출하지 않는다.
export const metadata: Metadata = { title: `내 감정서 — ${BRAND.name}`, robots: { index: false, follow: false } };

type Params = Promise<{ token: string }>;
type Search = Promise<{ new?: string; render?: string }>;

export default async function ReportPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { token } = await params;
  const { new: fresh, render } = await searchParams;
  const report = await getReport(token);
  if (!report) {
    // 취소된 주문은 안내를 보여 준다.
    const cancelled = await orderByToken(token).catch(() => null);
    if (cancelled?.status !== "cancelled") notFound();
    return (
      <SiteShell>
        <section className="card pay-result">
          <h2>취소된 신청입니다</h2>
          <p>이 감정서 신청은 취소되었고 결제도 전액 취소되었습니다. 카드사에 따라 영업일 기준 3~7일 안에 반영됩니다.</p>
          <p className="muted">주문번호 {cancelled.id}</p>
          <a className="btn-secondary link-btn" href="/">
            처음으로
          </a>
        </section>
      </SiteShell>
    );
  }
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
  // 공개 시각 전에는 본문을 내려보내지 않는다. PDF를 만드는 서버 브라우저만(서명이 맞을 때) 미리 열 수 있다.
  const renderer = Boolean(render) && render === renderSignature(token);
  const open = renderer || isReleased(report.order);
  const releaseAt = orderReleaseAt(report.order);
  const saved = open ? await getSavedParts(token, report.product.parts) : {};
  // 예약 발송(QStash)이 없거나 예약에 실패한 주문: 공개 뒤 화면을 열 때 완성 메일·문자를 보낸다(주문당 한 번).
  if (open && !renderer && !report.order.deliverAt && report.product.parts.every((p) => saved[p])) {
    const origin = originFrom(await headers());
    after(() => sendCompletionIfReady(report, origin).catch((e) => console.error("완성 발송 실패", e)));
  }
  const myReview = await getReviewByOrder(report.order.id).catch(() => null);
  return (
    <SiteShell>
      <ReportClient
        token={token}
        partKeys={report.product.parts}
        productName={report.product.name}
        productId={report.product.id}
        expiresAt={report.expiresAt}
        kept={report.kept}
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
        initialReview={
          myReview ? { name: myReview.name, rating: myReview.rating, text: myReview.text, createdAt: myReview.createdAt, hidden: Boolean(myReview.hidden) } : null
        }
        // 상품별 대기 시간이 지나야 화면에 감정서를 펼친다. 파일 만들기(서명된 render)는 기다리지 않는다.
        revealInMs={open ? 0 : Math.max(1000, releaseAt.getTime() - Date.now())}
        waitText={orderWaitLabel(report.order)}
        cancelAmount={!renderer && canCustomerCancel(report.order) ? won(report.order.amount) : null}
      />
    </SiteShell>
  );
}
