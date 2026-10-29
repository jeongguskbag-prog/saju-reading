import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import { completeReport } from "@/lib/fulfill";
import { scheduleDelivery } from "@/lib/delivery";
import { sendReceipt } from "@/lib/receipt";
import { creditQuestionOrder } from "@/lib/consult";
import { confirmOrder, OrderError } from "@/lib/orders";
import { originFrom } from "@/lib/site";
import { StoreError } from "@/lib/store";
import { trackStep } from "@/lib/funnel";

export const dynamic = "force-dynamic";
// 결제 승인 뒤 감정서 전체 작성(최대 몇 분)을 이 요청 뒤에 이어서 돌린다.
export const maxDuration = 800; // Vercel Pro 최대(13분 20초)

type Params = Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;

/** 토스 결제창에서 돌아오는 곳: 결제를 승인하고, 서버에서 감정서를 쓰기 시작한 뒤 리포트로 보낸다. */
export default async function PaySuccess({ searchParams }: { searchParams: Params }) {
  const { paymentKey, orderId, amount } = await searchParams;
  let token: string | null = null;
  let packDone = false;
  let giftCode: string | null = null;
  let message = "결제 정보를 확인하지 못했습니다.";
  if (paymentKey && orderId && amount && /^\d+$/.test(amount)) {
    try {
      const { order, justPaid } = await confirmOrder({ paymentKey, orderId, amount: Number(amount) });
      if (justPaid && !order.questionPack) await trackStep("paid");
      // AI 상담 질문권: 감정서를 쓰지 않고 회원에게 질문권만 넣는다(새로고침해도 한 번만).
      if (order.questionPack) {
        await creditQuestionOrder(order);
        packDone = true;
      }
      // 선물 주문: 감정서를 쓰지 않고 결제 확인과 선물 링크를 사는 분께 보낸 뒤 선물 링크 화면으로.
      if (order.gift) {
        giftCode = order.gift.code;
        if (justPaid) {
          const origin = originFrom(await headers());
          after(() => sendReceipt(order, origin).catch((e) => console.error("선물 결제 확인 발송 실패", e)));
        }
      }
      token = order.questionPack || order.gift ? null : (order.token ?? null);
      if (justPaid && token) {
        const origin = originFrom(await headers());
        const t = token;
        // 주문번호·결제 내역은 지금 고른 곳으로 보낸다.
        after(() => sendReceipt(order, origin).catch((e) => console.error("결제 확인 발송 실패", e)));
        // 감정서 PDF·HTML 파일은 상품별 공개 시각(release.ts)에 고른 곳으로 보낸다(QStash 예약).
        // QStash 설정이 없으면 완성 즉시 보낸다.
        await scheduleDelivery(order, origin);
        // 손님이 창을 닫아도 감정서를 끝까지 쓴다. 화면에는 공개 시각까지 명식 미리보기만 보인다.
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
  if (packDone) redirect("/consult?paid=1");
  if (giftCode) redirect(`/gift/${giftCode}?new=1`);
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
