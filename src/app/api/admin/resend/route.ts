import { cookies, headers } from "next/headers";
import { ADMIN_COOKIE, checkAdminSession } from "@/lib/admin";
import { deliverReport } from "@/lib/delivery";
import { completeReport } from "@/lib/fulfill";
import { getOrder, getReport, isReleased, setReleaseAt, unmarkMailed } from "@/lib/orders";
import { originFrom } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** 관리 화면의 '다시 보내기'(공개 전이면 '지금 보내기'): 감정서를 마저 쓰고 PDF·HTML 메일·문자를 보낸다. */
export async function POST(request: Request) {
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { orderId } = ((await request.json().catch(() => null)) ?? {}) as { orderId?: string };
  const order = orderId ? await getOrder(orderId) : null;
  if (!order?.token) return Response.json({ error: "결제한 주문을 찾지 못했습니다." }, { status: 404 });
  const origin = originFrom(await headers());
  // 공개 전 주문은 '지금 보내기': 공개 시각을 지금으로 당긴다(예약 발송은 나중에 '이미 보냄'으로 끝난다).
  if (!isReleased(order)) await setReleaseAt(order.id, new Date());
  await completeReport(order.token, origin, 200_000);
  const report = await getReport(order.token);
  if (!report) return Response.json({ error: "감정서를 찾지 못했습니다." }, { status: 404 });
  await unmarkMailed(order.id);
  const outcome = await deliverReport(report, origin);
  return Response.json({ outcome });
}
