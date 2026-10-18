import { parseBirthInput } from "@/lib/input";
import { addProfile, MemberError, memberFromRequest, removeProfile, setSelfProfile } from "@/lib/member";
import { calculateSaju, InputError } from "@/lib/saju/calc";

export const dynamic = "force-dynamic";

const error = (e: unknown) => {
  if (e instanceof MemberError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof InputError) return Response.json({ error: e.message }, { status: 400 });
  console.error(e);
  return Response.json({ error: "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
};

/** 사주 저장: 화면에서 방금 본 입력(생년월일시)을 그대로 받는다. */
export async function POST(request: Request) {
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const parsed = parseBirthInput((await request.json().catch(() => null))?.input);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    calculateSaju(parsed.value); // 계산이 되는 입력만 저장한다.
    const profile = await addProfile(m.id, parsed.value);
    return Response.json({ ok: true, id: profile.id });
  } catch (e) {
    return error(e);
  }
}

/** 내 사주로 정하기: { id } */
export async function PATCH(request: Request) {
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const id = String((await request.json().catch(() => null))?.id ?? "");
  try {
    await setSelfProfile(m.id, id);
    return Response.json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

/** 저장한 사주 지우기: ?id= */
export async function DELETE(request: Request) {
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    await removeProfile(m.id, new URL(request.url).searchParams.get("id") ?? "");
    return new Response(null, { status: 204 });
  } catch (e) {
    return error(e);
  }
}
