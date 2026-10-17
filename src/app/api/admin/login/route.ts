import { ADMIN_COOKIE, adminSessionValue, checkAdminPassword, isAdminEnabled } from "@/lib/admin";
import { clientIp } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** 관리 화면 로그인: 비밀번호가 맞으면 12시간짜리 쿠키. 같은 IP에서 1시간에 10번까지. */
export async function POST(request: Request) {
  if (!isAdminEnabled()) return Response.json({ error: "관리 화면이 꺼져 있습니다(ADMIN_PASSWORD 설정 필요)." }, { status: 503 });
  const store = getStore();
  const hour = new Date().toISOString().slice(0, 13);
  if (store && (await store.incr(`admin-login:${clientIp(request.headers)}:${hour}`, 3600)) > 10) {
    return Response.json({ error: "시도가 너무 많습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  if (!checkAdminPassword(String(body?.password ?? ""))) return Response.json({ error: "비밀번호가 맞지 않습니다." }, { status: 401 });
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${ADMIN_COOKIE}=${adminSessionValue()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${secure}`,
    },
  });
}

/** 로그아웃 */
export async function DELETE() {
  return new Response(null, { status: 204, headers: { "Set-Cookie": `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` } });
}
