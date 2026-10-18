import { clearSessionCookie } from "@/lib/member";

/** 로그아웃: 로그인 쿠키를 지운다. */
export async function POST() {
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie() } });
}
