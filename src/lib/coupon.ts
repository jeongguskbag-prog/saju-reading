// 할인 쿠폰: 관리 화면에서 코드(할인율·금액, 기한, 사용 횟수, 대상 상품)를 만들고, 손님이 결제 전에 코드를 넣으면 금액을 깎는다.
// 사용 횟수는 결제 승인 직전에 센다(승인 실패 시 되돌림). 비밀값 없음.
import { requireStore } from "./store";
import { PRODUCTS, type ProductId } from "./product";

export interface Coupon {
  code: string;
  /** 할인율(%, 1~90) 또는 할인 금액(원) 중 하나 */
  percent?: number;
  amountOff?: number;
  /** 비우면 모든 감정서 */
  productIds?: ProductId[];
  /** 이 시각까지 쓸 수 있다(ISO). 비우면 기한 없음. */
  expiresAt?: string;
  /** 비우면 횟수 제한 없음 */
  maxUses?: number;
  note?: string;
  disabled?: boolean;
  createdAt: string;
}

export interface CouponApplied {
  code: string;
  /** 깎은 금액(원) */
  discount: number;
  /** 원래 가격 */
  listPrice: number;
}

export class CouponError extends Error {}

/** 결제 최소 금액(토스 결제는 100원 이상) */
export const MIN_PAY = 1000;
const KEEP = 60 * 60 * 24 * 800; // 사용 횟수 기록은 2년 남짓 보관
const key = (code: string) => `coupon:${code}`;
const usedKey = (code: string) => `coupon-used:${code}`;
const backKey = (code: string) => `coupon-back:${code}`;
const LIST = "coupons";

export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9가-힣_-]{3,24}$/.test(c) ? c : null;
}

/** 할인 금액(10원 단위 내림, 결제 금액은 MIN_PAY 이상으로 남긴다) */
export function discountFor(c: Pick<Coupon, "percent" | "amountOff">, price: number): number {
  const raw = c.percent ? (price * c.percent) / 100 : (c.amountOff ?? 0);
  const d = Math.floor(raw / 10) * 10;
  return Math.max(0, Math.min(d, price - MIN_PAY));
}

export function describeCoupon(c: Pick<Coupon, "percent" | "amountOff">): string {
  return c.percent ? `${c.percent}% 할인` : `${(c.amountOff ?? 0).toLocaleString("ko-KR")}원 할인`;
}

export async function getCoupon(code: string): Promise<Coupon | null> {
  return requireStore().get<Coupon>(key(code));
}

export async function couponUses(code: string): Promise<number> {
  const store = requireStore();
  const [used, back] = await Promise.all([store.get<number>(usedKey(code)), store.get<number>(backKey(code))]);
  return Math.max(0, Number(used ?? 0) - Number(back ?? 0));
}

/** 관리자: 쿠폰 만들기(같은 코드가 있으면 거절) */
export async function createCoupon(input: {
  code: unknown;
  percent?: unknown;
  amountOff?: unknown;
  productIds?: unknown;
  expiresAt?: unknown;
  maxUses?: unknown;
  note?: unknown;
}, now = new Date()): Promise<Coupon> {
  const code = normalizeCode(input.code);
  if (!code) throw new CouponError("코드는 영문·숫자·한글 3~24자로 적어 주세요.");
  const percent = Number(input.percent) || undefined;
  const amountOff = Number(input.amountOff) || undefined;
  if (!percent === !amountOff) throw new CouponError("할인율(%)과 할인 금액(원) 중 하나만 적어 주세요.");
  if (percent && !(Number.isInteger(percent) && percent >= 1 && percent <= 90)) throw new CouponError("할인율은 1~90 사이 정수로 적어 주세요.");
  if (amountOff && !(Number.isInteger(amountOff) && amountOff >= 100 && amountOff <= 500_000)) throw new CouponError("할인 금액을 확인해 주세요.");
  const ids = Array.isArray(input.productIds) ? input.productIds.filter((p): p is ProductId => typeof p === "string" && p in PRODUCTS) : [];
  let expiresAt: string | undefined;
  if (input.expiresAt) {
    // "2026-12-31" → 그날 밤 23:59:59(한국 시간)까지
    const m = String(input.expiresAt).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) throw new CouponError("기한은 2026-12-31처럼 적어 주세요.");
    const end = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 23, 59, 59) - 9 * 3_600_000);
    if (end.getTime() < now.getTime()) throw new CouponError("기한이 이미 지났습니다.");
    expiresAt = end.toISOString();
  }
  const maxUses = Number(input.maxUses) || undefined;
  if (maxUses !== undefined && !(Number.isInteger(maxUses) && maxUses >= 1)) throw new CouponError("사용 횟수를 확인해 주세요.");
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 60) || undefined : undefined;
  const coupon: Coupon = {
    code,
    ...(percent ? { percent } : { amountOff }),
    ...(ids.length ? { productIds: ids } : {}),
    ...(expiresAt ? { expiresAt } : {}),
    ...(maxUses ? { maxUses } : {}),
    ...(note ? { note } : {}),
    createdAt: now.toISOString(),
  };
  const store = requireStore();
  if (!(await store.setIfAbsent(key(code), coupon))) throw new CouponError("같은 코드의 쿠폰이 이미 있습니다.");
  await store.listPush(LIST, code);
  return coupon;
}

/** 관리자: 쿠폰 끄기·켜기 */
export async function setCouponDisabled(code: string, disabled: boolean): Promise<void> {
  const c = await getCoupon(code);
  if (!c) throw new CouponError("쿠폰을 찾지 못했습니다.");
  await requireStore().set(key(code), { ...c, disabled });
}

export async function listCoupons(limit = 50): Promise<(Coupon & { uses: number })[]> {
  const codes = [...new Set(await requireStore().listRange(LIST, 0, limit - 1))];
  const rows = await Promise.all(
    codes.map(async (code) => {
      const c = await getCoupon(code);
      return c ? { ...c, uses: await couponUses(code) } : null;
    }),
  );
  return rows.filter((r): r is Coupon & { uses: number } => r !== null);
}

/** 손님이 넣은 코드를 상품 가격에 적용해 본다(아직 사용 횟수는 세지 않는다). */
export async function previewCoupon(rawCode: unknown, productId: ProductId, price: number, now = new Date()): Promise<CouponApplied & { label: string }> {
  const code = normalizeCode(rawCode);
  if (!code) throw new CouponError("쿠폰 코드를 확인해 주세요.");
  const c = await getCoupon(code);
  if (!c || c.disabled) throw new CouponError("사용할 수 없는 쿠폰 코드입니다.");
  if (c.expiresAt && now.getTime() > new Date(c.expiresAt).getTime()) throw new CouponError("기한이 지난 쿠폰입니다.");
  if (c.productIds?.length && !c.productIds.includes(productId)) {
    const names = c.productIds.map((id) => PRODUCTS[id]?.name ?? id).join(", ");
    throw new CouponError(`이 쿠폰은 ${names}에만 쓸 수 있습니다.`);
  }
  if (c.maxUses && (await couponUses(code)) >= c.maxUses) throw new CouponError("사용 횟수가 다 찬 쿠폰입니다.");
  const discount = discountFor(c, price);
  if (discount <= 0) throw new CouponError("이 상품에는 할인이 적용되지 않습니다.");
  return { code, discount, listPrice: price, label: describeCoupon(c) };
}

/** 결제 승인 직전: 사용 횟수를 하나 올린다. 한도를 넘으면 되돌리고 거절한다. */
export async function claimCouponUse(code: string): Promise<void> {
  const c = await getCoupon(code);
  const store = requireStore();
  await store.incr(usedKey(code), KEEP);
  if (c?.maxUses && (await couponUses(code)) > c.maxUses) {
    await releaseCouponUse(code);
    throw new CouponError("쿠폰 사용 횟수가 다 찼습니다. 쿠폰 없이 다시 신청해 주세요.");
  }
}

/** 결제 승인이 실패했거나 결제를 취소했을 때 사용 횟수를 되돌린다. */
export async function releaseCouponUse(code: string): Promise<void> {
  await requireStore().incr(backKey(code), KEEP);
}
