import { kakaoUnlink } from "@/lib/kakao-login";
import { clearSessionCookie, deleteMember, isMemberEnabled, memberFromRequest } from "@/lib/member";

export const dynamic = "force-dynamic";

/** 로그인 상태(화면에서 '내 사주로 저장' 단추를 보일지 정할 때 쓴다). */
export async function GET(request: Request) {
  if (!isMemberEnabled()) return Response.json({ enabled: false, member: null });
  const m = await memberFromRequest(request).catch(() => null);
  return Response.json(
    { enabled: true, member: m ? { nickname: m.nickname, profiles: m.profiles.length } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** 회원 탈퇴 */
export async function DELETE(request: Request) {
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  await deleteMember(m.id);
  await kakaoUnlink(m.providerId);
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie() } });
}
