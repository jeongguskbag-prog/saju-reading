import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { sendReportEmail } from "@/lib/mail";
import { confirmOrder, OrderError } from "@/lib/orders";
import { StoreError } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;

async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** 토스 결제창에서 돌아오는 곳: 결제를 승인하고 리포트로 보낸다. */
export default async function PaySuccess({ searchParams }: { searchParams: Params }) {
  const { paymentKey, orderId, amount } = await searchParams;
  let token: string | null = null;
  let message = "결제 정보를 확인하지 못했습니다.";
  if (paymentKey && orderId && amount && /^\d+$/.test(amount)) {
    try {
      const { order, justPaid } = await confirmOrder({ paymentKey, orderId, amount: Number(amount) });
      token = order.token ?? null;
      if (justPaid && token) await sendReportEmail(order, `${await siteOrigin()}/r/${token}`);
    } catch (error) {
      if (error instanceof OrderError) message = error.message;
      else if (error instanceof StoreError) message = "주문 저장소에 연결하지 못했습니다. 잠시 후 이 페이지를 새로고침해 주세요.";
      else {
        console.error(error);
        message = "결제 승인 중 오류가 났습니다. 잠시 후 이 페이지를 새로고침해 주세요.";
      }
    }
  }
  if (token) redirect(`/r/${token}?new=1`);
  return (
    <SiteShell>
      <section className="card pay-result">
        <h2>결제를 마치지 못했습니다</h2>
        <p>{message}</p>
        <p className="muted">카드사에서 금액이 빠져나갔는데 이 화면이 보이면, 주문번호 {orderId ?? "-"}와 함께 문의해 주세요.</p>
        <a className="btn-secondary link-btn" href="/#saju-form">처음으로 돌아가기</a>
      </section>
    </SiteShell>
  );
}
