import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkAdminSession } from "@/lib/admin";
import { cancelOrder, OrderError } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** 관리 화면의 '결제 취소': 토스에 전액 취소를 요청하고 주문을 취소로 바꾼다. */
export async function POST(request: Request) {
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { orderId, reason } = ((await request.json().catch(() => null)) ?? {}) as { orderId?: string; reason?: string };
  if (!orderId) return Response.json({ error: "주문번호가 없습니다." }, { status: 400 });
  try {
    const order = await cancelOrder(orderId, String(reason ?? "고객 요청"));
    return Response.json({ ok: true, status: order.status });
  } catch (error) {
    if (error instanceof OrderError) return Response.json({ error: error.message }, { status: error.status });
    console.error("결제 취소 실패", error);
    return Response.json({ error: "결제를 취소하지 못했습니다." }, { status: 500 });
  }
}
