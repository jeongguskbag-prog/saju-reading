import { NextResponse } from "next/server";
import { parseBirthInput } from "@/lib/input";
import { checkoutConfig, createOrder, OrderError } from "@/lib/orders";
import { InputError } from "@/lib/saju/calc";
import { StoreError } from "@/lib/store";

/** 주문 생성: 입력(생년월일시)과 이메일을 받아 토스 결제창에 넘길 값을 돌려준다. */
export async function POST(request: Request) {
  const config = checkoutConfig();
  if (!config.enabled) return NextResponse.json({ error: "결제가 아직 열리지 않았습니다." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const parsed = parseBirthInput(body?.input);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (body?.agree !== true) return NextResponse.json({ error: "주문 내용과 청약철회 안내에 동의해 주세요." }, { status: 400 });
  try {
    const order = await createOrder(parsed.value, String(body?.email ?? "").trim(), body?.productId);
    return NextResponse.json({
      orderId: order.id,
      orderName: order.orderName,
      amount: order.amount,
      customerKey: order.customerKey,
      customerEmail: order.email,
      customerName: order.input.name,
      clientKey: config.clientKey,
    });
  } catch (error) {
    if (error instanceof InputError || error instanceof OrderError) {
      return NextResponse.json({ error: error.message }, { status: error instanceof OrderError ? error.status : 400 });
    }
    if (error instanceof StoreError) return NextResponse.json({ error: "주문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: "주문을 만들지 못했습니다." }, { status: 500 });
  }
}
