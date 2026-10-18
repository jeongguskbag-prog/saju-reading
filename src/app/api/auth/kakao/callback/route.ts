import { KakaoError, KAKAO_STATE_COOKIE, kakaoProfile, safeNext } from "@/lib/kakao-login";
import { findOrCreateMember, isMemberEnabled, sessionCookie } from "@/lib/member";
import { clientIp } from "@/lib/rate-limit";
import { originFrom } from "@/lib/site";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** 카카오 동의 화면에서 돌아온 곳: 회원을 찾거나 만들고 로그인 쿠키를 준다. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = originFrom(request.headers);
  const fail = (reason: string) => Response.redirect(`${origin}/my?error=${reason}`, 302);
  if (!isMemberEnabled()) return fail("disabled");
  // 손님이 카카오 동의 화면에서 '취소'를 누르면 error가 온다.
  if (url.searchParams.get("error")) return fail("cancelled");
  const cookie = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${KAKAO_STATE_COOKIE}=`))
    ?.slice(KAKAO_STATE_COOKIE.length + 1);
  const [state, nextRaw] = (cookie ?? "").split("|");
  const code = url.searchParams.get("code");
  if (!code || !state || url.searchParams.get("state") !== state) return fail("state");
  const hour = new Date().toISOString().slice(0, 13);
  if (((await getStore()?.incr(`kakao-login:${clientIp(request.headers)}:${hour}`, 3600)) ?? 0) > 30) return fail("busy");
  try {
    const profile = await kakaoProfile(origin, code);
    const { member, created } = await findOrCreateMember("kakao", profile.id, profile.nickname);
    const next = safeNext(nextRaw ? decodeURIComponent(nextRaw) : null);
    const to = created && next === "/my" ? "/my?welcome=1" : next;
    const headers = new Headers({ Location: `${origin}${to}` });
    headers.append("Set-Cookie", sessionCookie(member.id, origin.startsWith("https:")));
    headers.append("Set-Cookie", `${KAKAO_STATE_COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0`);
    return new Response(null, { status: 302, headers });
  } catch (error) {
    console.error(error);
    return fail(error instanceof KakaoError ? "kakao" : "server");
  }
}
