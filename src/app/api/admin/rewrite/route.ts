import { after } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkAdminSession } from "@/lib/admin";
import { rewritePart } from "@/lib/fulfill";
import { getOrder, getReport, isReleased } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 관리 화면의 '다시 쓰기': 공개(발송) 전 감정서의 풀이를 AI로 새로 쓴다. { orderId, part? } part가 없으면 모든 파트.
 * 시간이 걸려 바로 응답하고 뒤에서 쓴다. 이미 공개된 감정서는 손님이 본 내용과 달라지므로 막는다.
 */
export async function POST(request: Request) {
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { orderId, part } = ((await request.json().catch(() => null)) ?? {}) as { orderId?: string; part?: string };
  const order = orderId ? await getOrder(orderId) : null;
  if (!order?.token || order.status !== "paid") return Response.json({ error: "결제한 감정서 주문이 아닙니다." }, { status: 400 });
  if (isReleased(order)) return Response.json({ error: "이미 공개(발송)된 감정서는 다시 쓸 수 없습니다." }, { status: 409 });
  const report = await getReport(order.token);
  if (!report) return Response.json({ error: "감정서를 찾지 못했습니다." }, { status: 404 });
  const parts = part ? report.product.parts.filter((p) => p === part) : [...report.product.parts];
  if (!parts.length) return Response.json({ error: "없는 파트입니다." }, { status: 400 });
  after(async () => {
    const results = await Promise.allSettled(parts.map((p) => rewritePart(report, p)));
    results.forEach((r, i) => r.status === "rejected" && console.error(`다시 쓰기 실패(${order.id} ${parts[i]})`, r.reason));
  });
  return Response.json({ ok: true, parts });
}
