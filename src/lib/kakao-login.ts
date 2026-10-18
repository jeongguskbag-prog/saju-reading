// 카카오 로그인(OAuth 2.0)(서버 전용). 카카오 개발자 사이트에 등록한 앱의 REST API 키로 동작한다.
// 받는 정보는 카카오 회원번호와 닉네임뿐이며, 카카오 접속 토큰은 회원 정보를 읽은 뒤 버린다.
const AUTH = "https://kauth.kakao.com";
const API = "https://kapi.kakao.com";

export const KAKAO_STATE_COOKIE = "chungirok_kakao_state";

export const callbackUrl = (origin: string) => `${origin}/api/auth/kakao/callback`;

export function authorizeUrl(origin: string, state: string): string {
  const q = new URLSearchParams({ response_type: "code", client_id: process.env.KAKAO_REST_API_KEY ?? "", redirect_uri: callbackUrl(origin), state });
  return `${AUTH}/oauth/authorize?${q}`;
}

export class KakaoError extends Error {}

/** 인가 코드로 카카오 회원번호·닉네임을 받는다. */
export async function kakaoProfile(origin: string, code: string): Promise<{ id: string; nickname: string }> {
  const form = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.KAKAO_REST_API_KEY ?? "",
    redirect_uri: callbackUrl(origin),
    code,
    ...(process.env.KAKAO_CLIENT_SECRET ? { client_secret: process.env.KAKAO_CLIENT_SECRET } : {}),
  });
  const tokenRes = await fetch(`${AUTH}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: form,
    cache: "no-store",
  });
  const token = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!tokenRes.ok || !token.access_token) throw new KakaoError(`카카오 로그인 토큰을 받지 못했습니다: ${token.error_description ?? tokenRes.status}`);
  const meRes = await fetch(`${API}/v2/user/me`, { headers: { Authorization: `Bearer ${token.access_token}` }, cache: "no-store" });
  const me = (await meRes.json().catch(() => ({}))) as { id?: number; properties?: { nickname?: string }; kakao_account?: { profile?: { nickname?: string } } };
  if (!meRes.ok || !me.id) throw new KakaoError(`카카오 회원 정보를 받지 못했습니다: ${meRes.status}`);
  const nickname = (me.kakao_account?.profile?.nickname ?? me.properties?.nickname ?? "").trim().slice(0, 30);
  return { id: String(me.id), nickname };
}

/** 회원 탈퇴 때 카카오 앱 연결을 끊는다. 어드민 키(KAKAO_ADMIN_KEY)가 있을 때만. 실패해도 탈퇴는 진행한다. */
export async function kakaoUnlink(kakaoId: string): Promise<void> {
  const admin = process.env.KAKAO_ADMIN_KEY;
  if (!admin) return;
  await fetch(`${API}/v1/user/unlink`, {
    method: "POST",
    headers: { Authorization: `KakaoAK ${admin}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({ target_id_type: "user_id", target_id: kakaoId }),
    cache: "no-store",
  }).catch(() => {});
}

/** 로그인 뒤 돌아갈 곳. 우리 사이트 안의 경로만 받는다. */
export const safeNext = (next: string | null | undefined) => (next && /^\/(?!\/)[\w\-./?=&%#]*$/.test(next) ? next : "/my");
