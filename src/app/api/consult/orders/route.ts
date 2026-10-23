import { createQuestionOrder, isPackId } from "@/lib/consult";
import { memberFromRequest } from "@/lib/member";
import { checkoutConfig } from "@/lib/orders";
import { StoreError } from "@/lib/store";
import { isAdminViewer } from "@/lib/checkout-access";

export const dynamic = "force-dynamic";

/** 질문권 주문: { packId, profileId } → 토스 결제창에 넘길 값 */
export async function POST(request: Request) {
  const config = checkoutConfig({ admin: await isAdminViewer() });
  if (!config.enabled) return Response.json({ error: "결제가 아직 열리지 않았습니다." }, { status: 503 });
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { packId?: unknown; profileId?: unknown; agree?: unknown } | null;
  if (!isPackId(body?.packId)) return Response.json({ error: "질문권을 골라 주세요." }, { status: 400 });
  if (body?.agree !== true) return Response.json({ error: "구매 내용과 환불 안내에 동의해 주세요." }, { status: 400 });
  const profile = m.profiles.find((p) => p.id === body?.profileId) ?? m.profiles.find((p) => p.self);
  if (!profile) return Response.json({ error: "마이에 사주를 먼저 저장해 주세요." }, { status: 400 });
  try {
    const order = await createQuestionOrder(m, body.packId, profile.input);
    return Response.json({
      orderId: order.id,
      orderName: order.orderName,
      amount: order.amount,
      customerKey: order.customerKey,
      customerName: m.nickname,
      clientKey: config.clientKey,
    });
  } catch (error) {
    if (error instanceof StoreError) return Response.json({ error: "주문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    console.error(error);
    return Response.json({ error: "주문을 만들지 못했습니다." }, { status: 500 });
  }
}
