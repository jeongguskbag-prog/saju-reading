import { NextResponse } from "next/server";
import { createGiftOrder } from "@/lib/gift";
import { memberFromRequest } from "@/lib/member";
import { checkoutConfig, OrderError } from "@/lib/orders";
import { StoreError } from "@/lib/store";

export const dynamic = "force-dynamic";

/** 선물 주문: { productId, from, to, message, email, phone, targets, agree } → 토스 결제창에 넘길 값 */
export async function POST(request: Request) {
  const config = checkoutConfig();
  if (!config.enabled) return NextResponse.json({ error: "결제가 아직 열리지 않았습니다." }, { status: 503 });
  const body = await request.json().catch(() => null);
  if (body?.agree !== true) return NextResponse.json({ error: "주문 내용과 환불 안내에 동의해 주세요." }, { status: 400 });
  const phone = typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : undefined;
  if (!phone) return NextResponse.json({ error: "휴대폰 번호를 적어 주세요." }, { status: 400 });
  const email = String(body?.email ?? "").trim();
  const targets = (Array.isArray(body?.targets) ? body.targets : []).filter((c: unknown): c is "email" | "kakao" | "sms" => c === "email" || c === "kakao" || c === "sms");
  try {
    const member = await memberFromRequest(request).catch(() => null);
    const order = await createGiftOrder({ productId: body?.productId, from: body?.from, to: body?.to, message: body?.message, email, phone, targets, memberId: member?.id });
    return NextResponse.json({
      orderId: order.id,
      orderName: order.orderName,
      amount: order.amount,
      customerKey: order.customerKey,
      customerEmail: order.email || undefined,
      customerMobilePhone: order.phone,
      customerName: order.gift?.from,
      clientKey: config.clientKey,
    });
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof StoreError) return NextResponse.json({ error: "주문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: "주문을 만들지 못했습니다." }, { status: 500 });
  }
}
