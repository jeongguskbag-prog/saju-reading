import { randomBytes } from "node:crypto";
import { authorizeUrl, KAKAO_STATE_COOKIE, safeNext } from "@/lib/kakao-login";
import { isMemberEnabled } from "@/lib/member";
import { originFrom } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 카카오 로그인 시작: 위조 방지 값(state)을 쿠키에 두고 카카오 동의 화면으로 보낸다. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = originFrom(request.headers);
  if (!isMemberEnabled()) return Response.redirect(`${origin}/my?error=disabled`, 302);
  const state = randomBytes(16).toString("base64url");
  const next = safeNext(url.searchParams.get("next"));
  const secure = origin.startsWith("https:") ? "; Secure" : "";
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl(origin, state),
      "Set-Cookie": `${KAKAO_STATE_COOKIE}=${state}|${encodeURIComponent(next)}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
    },
  });
}
