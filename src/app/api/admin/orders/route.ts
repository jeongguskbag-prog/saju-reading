import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkAdminSession, orderRow, ordersCsv } from "@/lib/admin";
import { listPaidOrders } from "@/lib/orders";
import { originFrom } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 결제한 주문을 CSV(엑셀)로 내려받는다. 관리 화면 로그인 필요. */
export async function GET(request: Request) {
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) return new Response("로그인이 필요합니다.", { status: 401 });
  const origin = originFrom(request.headers);
  const rows = (await listPaidOrders(5000)).map((o) => orderRow(o, origin));
  const day = new Date(Date.now() + 9 * 3_600_000).toISOString().slice(0, 10);
  return new Response(ordersCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chungirok-orders-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
