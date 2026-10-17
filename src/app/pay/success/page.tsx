import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { completeReport } from "@/lib/fulfill";
import { scheduleDelivery } from "@/lib/delivery";
import { sendReceipt } from "@/lib/receipt";
import { confirmOrder, OrderError } from "@/lib/orders";
import { originFrom } from "@/lib/site";
import { StoreError } from "@/lib/store";

export const dynamic = "force-dynamic";
// 결제 승인 뒤 감정서 전체 작성(최대 몇 분)을 이 요청 뒤에 이어서 돌린다.
export const maxDuration = 300;

type Params = Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;

/** 토스 결제창에서 돌아오는 곳: 결제를 승인하고, 서버에서 감정서를 쓰기 시작한 뒤 리포트로 보낸다. */
export default async function PaySuccess({ searchParams }: { searchParams: Params }) {
  const { paymentKey, orderId, amount } = await searchParams;
  let token: string | null = null;
  let message = "결제 정보를 확인하지 못했습니다.";
  if (paymentKey && orderId && amount && /^\d+$/.test(amount)) {
    try {
      const { order, justPaid } = await confirmOrder({ paymentKey, orderId, amount: Number(amount) });
      token = order.token ?? null;
      if (justPaid && token) {
        const origin = originFrom(await headers());
        const t = token;
        // 주문번호·결제 내역은 지금 고른 곳으로 보낸다.
        after(() => sendReceipt(order, origin).catch((e) => console.error("결제 확인 발송 실패", e)));
        // 감정서 PDF·HTML 파일은 신청 3분 뒤 고른 곳으로 보낸다(QStash 예약).
        // QStash 설정이 없으면 완성 즉시 보낸다.
        await scheduleDelivery(order, origin);
        // 손님이 창을 닫아도 감정서를 끝까지 쓴다. 화면에는 완성되는 대로 바로 보인다.
        after(() => completeReport(t, origin));
      }
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
