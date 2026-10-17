import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkAdminSession } from "@/lib/admin";
import { setReviewHidden } from "@/lib/reviews";

export const dynamic = "force-dynamic";

/** 관리자: 후기 숨기기/보이기 { orderId, hidden } */
export async function POST(request: Request) {
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { orderId?: unknown; hidden?: unknown } | null;
  const ok = await setReviewHidden(String(body?.orderId ?? ""), body?.hidden === true);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "후기를 찾지 못했습니다." }, { status: 404 });
}
