import { customerCancel, OrderError } from "@/lib/orders";
import { clientIp } from "@/lib/rate-limit";
import { getStore, StoreError } from "@/lib/store";

export const dynamic = "force-dynamic";

/** 손님의 발송 전 신청 취소: { token } → 결제 전액 취소. 같은 기기에서 1시간에 10번까지. */
export async function POST(request: Request) {
  const store = getStore();
  const hour = new Date().toISOString().slice(0, 13);
  if (store && (await store.incr(`cancel-rate:${clientIp(request.headers)}:${hour}`, 3600).catch(() => 0)) > 10) {
    return Response.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  }
  const { token } = ((await request.json().catch(() => null)) ?? {}) as { token?: unknown };
  if (typeof token !== "string") return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  try {
    const order = await customerCancel(token);
    return Response.json({ ok: true, amount: order.amount, orderId: order.id });
  } catch (error) {
    if (error instanceof OrderError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof StoreError) return Response.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 503 });
    console.error("손님 취소 실패", error);
    return Response.json({ error: "취소하지 못했습니다. 고객센터로 문의해 주세요." }, { status: 500 });
  }
}
