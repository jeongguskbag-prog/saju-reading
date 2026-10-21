import { CouponError, previewCoupon } from "@/lib/coupon";
import { sellableProducts, type ProductId } from "@/lib/product";
import { clientIp } from "@/lib/rate-limit";
import { getStore, StoreError } from "@/lib/store";

export const dynamic = "force-dynamic";

/** 결제 전 쿠폰 확인: { code, productId } → 할인 금액과 결제 금액. 코드를 마구 넣어 보지 못하게 IP당 시간 30번까지. */
export async function POST(request: Request) {
  const store = getStore();
  if (!store) return Response.json({ error: "지금은 쿠폰을 쓸 수 없습니다." }, { status: 503 });
  const hour = new Date().toISOString().slice(0, 13);
  if ((await store.incr(`coupon-rate:${clientIp(request.headers)}:${hour}`, 3600).catch(() => 0)) > 30) {
    return Response.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { code?: unknown; productId?: unknown } | null;
  const product = sellableProducts().find((p) => p.id === body?.productId);
  if (!product) return Response.json({ error: "상품을 먼저 골라 주세요." }, { status: 400 });
  try {
    const c = await previewCoupon(body?.code, product.id as ProductId, product.price);
    return Response.json({ code: c.code, discount: c.discount, amount: product.price - c.discount, label: c.label });
  } catch (error) {
    if (error instanceof CouponError) return Response.json({ error: error.message }, { status: 400 });
    if (error instanceof StoreError) return Response.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 503 });
    throw error;
  }
}
