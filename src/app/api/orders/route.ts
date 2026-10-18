import { NextResponse } from "next/server";
import { parseNamingRequest } from "@/lib/naming/request";
import { parseBirthInput } from "@/lib/input";
import { memberFromRequest } from "@/lib/member";
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
  let naming;
  if (body?.productId === "naming") {
    const n = parseNamingRequest(body?.naming);
    if (!n.ok) return NextResponse.json({ error: n.error }, { status: 400 });
    naming = n.value;
  }
  try {
    const phone = typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : undefined;
    // 휴대폰 번호는 필수(주문 조회·고객 연락용)
    if (!phone) return NextResponse.json({ error: "휴대폰 번호를 적어 주세요." }, { status: 400 });
    // 주문번호·결제 내역을 받을 곳: targets(["email","kakao","sms"]). 예전 화면의 channels·channel도 받아 준다.
    const email = String(body?.email ?? "").trim();
    const raw: unknown[] = Array.isArray(body?.targets)
      ? body.targets
      : [...(email ? ["email"] : []), ...(Array.isArray(body?.channels) ? body.channels : phone ? [body?.channel === "kakao" ? "kakao" : "sms"] : [])];
    const targets = raw.filter((c): c is "email" | "kakao" | "sms" => c === "email" || c === "kakao" || c === "sms");
    // 로그인한 회원이 사면 결제 후 그 회원의 감정서 보관함에 넣는다.
    const member = await memberFromRequest(request).catch(() => null);
    const order = await createOrder(parsed.value, email, body?.productId, new Date(), naming, phone, targets, body?.extra, member?.id);
    return NextResponse.json({
      orderId: order.id,
      orderName: order.orderName,
      amount: order.amount,
      customerKey: order.customerKey,
      customerEmail: order.email || undefined,
      customerMobilePhone: order.phone,
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
