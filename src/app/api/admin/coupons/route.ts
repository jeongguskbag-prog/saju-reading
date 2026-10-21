import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkAdminSession } from "@/lib/admin";
import { CouponError, createCoupon, normalizeCode, setCouponDisabled } from "@/lib/coupon";

export const dynamic = "force-dynamic";

/** 관리 화면: 쿠폰 만들기 { code, percent | amountOff, productIds?, expiresAt?, maxUses?, note? } / 끄기·켜기 { code, disabled } */
export async function POST(request: Request) {
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  try {
    if (typeof body.disabled === "boolean") {
      const code = normalizeCode(body.code);
      if (!code) return Response.json({ error: "코드가 없습니다." }, { status: 400 });
      await setCouponDisabled(code, body.disabled);
      return Response.json({ ok: true });
    }
    const coupon = await createCoupon({ ...body, code: body.code });
    return Response.json({ ok: true, coupon });
  } catch (error) {
    if (error instanceof CouponError) return Response.json({ error: error.message }, { status: 400 });
    console.error("쿠폰 처리 실패", error);
    return Response.json({ error: "쿠폰을 저장하지 못했습니다." }, { status: 500 });
  }
}
