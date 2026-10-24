import { OWNER_APP_COOKIE, ownerAppCookieValue } from "@/lib/admin";
import { isAppRequest } from "@/lib/reading";

export const dynamic = "force-dynamic";

/** 관리자용 앱이 앱 접근 키를 보내면 '관리자용 앱' 쿠키(1년)를 준다. 관리 화면은 이 쿠키가 있을 때만 열린다. */
export async function POST(request: Request) {
  const value = ownerAppCookieValue();
  if (!value || !isAppRequest(request.headers.get("x-app-key"))) return new Response(null, { status: 403 });
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": `${OWNER_APP_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${secure}` },
  });
}
