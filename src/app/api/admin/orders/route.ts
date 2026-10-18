import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminDownloadToken, checkAdminDownloadToken, checkAdminSession, orderRow, ordersCsv } from "@/lib/admin";
import { listPaidOrders } from "@/lib/orders";
import { originFrom } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 로그인한 관리자에게 5분짜리 다운로드 주소를 준다(천기록 앱에서 휴대폰 브라우저로 넘겨 받을 때). */
export async function POST() {
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return Response.json({ path: `/api/admin/orders?t=${adminDownloadToken()}` });
}

/** 결제한 주문을 CSV(엑셀)로 내려받는다. 관리 화면 로그인(또는 5분짜리 다운로드 표) 필요. */
export async function GET(request: Request) {
  const t = new URL(request.url).searchParams.get("t");
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value) && !checkAdminDownloadToken(t)) {
    return new Response("로그인이 필요합니다. 관리 화면에서 다시 눌러 주세요.", { status: 401, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
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
