import { MemberError, memberFromRequest, setMonthlyMail } from "@/lib/member";

export const dynamic = "force-dynamic";

/** 이달의 운세 메일: 받기 { email, agree: true } / 그만 받기 { off: true } */
export async function POST(request: Request) {
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = ((await request.json().catch(() => null)) ?? {}) as { email?: unknown; agree?: unknown; off?: unknown };
  try {
    if (body.off === true) {
      await setMonthlyMail(m.id, null);
      return Response.json({ ok: true, on: false });
    }
    if (body.agree !== true) return Response.json({ error: "이달의 운세 메일(광고성 정보) 수신에 동의해 주세요." }, { status: 400 });
    if (typeof body.email !== "string") return Response.json({ error: "이메일 주소를 적어 주세요." }, { status: 400 });
    const next = await setMonthlyMail(m.id, body.email);
    return Response.json({ ok: true, on: true, email: next.monthlyMail?.email });
  } catch (e) {
    if (e instanceof MemberError) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
