import { after, NextResponse } from "next/server";
import { redeemGift } from "@/lib/gift";
import { parseBirthInput } from "@/lib/input";
import { OrderError } from "@/lib/orders";
import { InputError } from "@/lib/saju/calc";
import { StoreError } from "@/lib/store";
import { scheduleDelivery } from "@/lib/delivery";
import { completeReport } from "@/lib/fulfill";
import { originFrom } from "@/lib/site";
import { clientIp } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
// 받은 뒤 감정서 전체 작성을 이 요청 뒤에 이어서 돌린다.
export const maxDuration = 300;

/** 선물 받기: { code, input, email, phone, targets, agree } → 감정서 주소 */
export async function POST(request: Request) {
  const store = getStore();
  const hour = new Date().toISOString().slice(0, 13);
  if (store && (await store.incr(`gift-redeem-rate:${clientIp(request.headers)}:${hour}`, 3600)) > 20) {
    return NextResponse.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (body?.agree !== true) return NextResponse.json({ error: "개인정보 수집·이용에 동의해 주세요." }, { status: 400 });
  const parsed = parseBirthInput(body?.input);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const phone = typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : undefined;
  const email = String(body?.email ?? "").trim();
  const targets = (Array.isArray(body?.targets) ? body.targets : []).filter((c: unknown): c is "email" | "kakao" | "sms" => c === "email" || c === "kakao" || c === "sms");
  try {
    const { order, created } = await redeemGift(String(body?.code ?? ""), parsed.value, { email, phone, targets });
    if (created && order.token) {
      const origin = originFrom(request.headers);
      const token = order.token;
      await scheduleDelivery(order, origin);
      after(() => completeReport(token, origin));
    }
    return NextResponse.json({ url: `/r/${order.token}?new=1` });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof StoreError) return NextResponse.json({ error: "저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    console.error(error);
    return NextResponse.json({ error: "선물을 받지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
