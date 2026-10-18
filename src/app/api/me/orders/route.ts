import { LOOKUP_PER_HOUR } from "@/lib/lookup";
import { claimOrder, MemberError, memberFromRequest } from "@/lib/member";
import { clientIp } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** 예전에 산 감정서를 보관함에 넣기: 주문번호 + 주문할 때 적은 이메일 또는 휴대폰 번호 */
export async function POST(request: Request) {
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const hour = new Date().toISOString().slice(0, 13);
  if (((await getStore()?.incr(`lookup:${clientIp(request.headers)}:${hour}`, 3600)) ?? 0) > LOOKUP_PER_HOUR) {
    return Response.json({ error: "조회를 너무 여러 번 시도했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { orderId?: unknown; contact?: unknown } | null;
  try {
    const order = await claimOrder(m.id, String(body?.orderId ?? ""), String(body?.contact ?? ""));
    return Response.json({ ok: true, url: `/r/${order.token}` });
  } catch (e) {
    if (e instanceof MemberError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "보관함에 넣지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
