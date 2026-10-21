import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { couponUses, createCoupon, discountFor, MIN_PAY, previewCoupon, setCouponDisabled } from "@/lib/coupon";
import { confirmOrder, createOrder } from "@/lib/orders";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import type { BirthInput } from "@/lib/saju/calc";

const input: BirthInput = { name: "홍길동", gender: "male", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 };
const toss = (body: object, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const NOW = new Date("2026-10-21T03:00:00Z");

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("할인 쿠폰", () => {
  it("할인 금액은 10원 단위로 내리고, 결제 금액을 최소 금액 아래로 내리지 않는다", () => {
    expect(discountFor({ percent: 10 }, 49000)).toBe(4900);
    expect(discountFor({ percent: 15 }, 9900)).toBe(1480);
    expect(discountFor({ amountOff: 100000 }, 9900)).toBe(9900 - MIN_PAY);
  });

  it("만들 때 값을 확인하고 같은 코드는 막는다", async () => {
    await expect(createCoupon({ code: "a" , percent: 10 }, NOW)).rejects.toThrow("3~24자");
    await expect(createCoupon({ code: "BOTH", percent: 10, amountOff: 1000 }, NOW)).rejects.toThrow("하나만");
    await expect(createCoupon({ code: "BIG", percent: 95 }, NOW)).rejects.toThrow("1~90");
    await expect(createCoupon({ code: "OLD", percent: 10, expiresAt: "2026-01-01" }, NOW)).rejects.toThrow("지났습니다");
    const c = await createCoupon({ code: "welcome10", percent: 10, expiresAt: "2026-12-31" }, NOW);
    expect(c.code).toBe("WELCOME10");
    await expect(createCoupon({ code: "WELCOME10", percent: 5 }, NOW)).rejects.toThrow("이미");
  });

  it("기한·대상 상품·끄기를 지킨다", async () => {
    await createCoupon({ code: "XMAS", amountOff: 5000, productIds: ["full"], expiresAt: "2026-12-25" }, NOW);
    expect((await previewCoupon("xmas", "full", 49000, NOW)).discount).toBe(5000);
    await expect(previewCoupon("XMAS", "core", 19900, NOW)).rejects.toThrow("에만");
    await expect(previewCoupon("XMAS", "full", 49000, new Date("2026-12-26T00:00:00Z"))).rejects.toThrow("기한");
    await setCouponDisabled("XMAS", true);
    await expect(previewCoupon("XMAS", "full", 49000, NOW)).rejects.toThrow("사용할 수 없는");
    await expect(previewCoupon("NONE", "full", 49000, NOW)).rejects.toThrow("사용할 수 없는");
  });

  it("주문 금액에 할인이 들어가고, 결제 승인 때 사용 횟수를 세며 한도를 넘으면 결제하지 않는다", async () => {
    await createCoupon({ code: "ONE", percent: 20, maxUses: 1 }, NOW);
    const a = await createOrder(input, "a@b.co", "full", NOW, undefined, "010-1234-5678", ["email"], undefined, undefined, "one");
    const b = await createOrder(input, "a@b.co", "full", NOW, undefined, "010-1234-5678", ["email"], undefined, undefined, "ONE");
    expect(a.amount).toBe(49000 - 9800);
    expect(a.coupon).toEqual({ code: "ONE", discount: 9800, listPrice: 49000 });
    vi.stubGlobal("fetch", toss({ orderId: a.id, status: "DONE", totalAmount: a.amount }));
    await confirmOrder({ paymentKey: "pk_a", orderId: a.id, amount: a.amount });
    expect(await couponUses("ONE")).toBe(1);
    const tossCall = vi.fn();
    vi.stubGlobal("fetch", tossCall);
    await expect(confirmOrder({ paymentKey: "pk_b", orderId: b.id, amount: b.amount })).rejects.toThrow("횟수");
    expect(tossCall).not.toHaveBeenCalled();
    expect(await couponUses("ONE")).toBe(1);
    // 한도가 찬 쿠폰으로는 새 주문도 만들 수 없다
    await expect(createOrder(input, "a@b.co", "full", NOW, undefined, "010-1234-5678", ["email"], undefined, undefined, "ONE")).rejects.toThrow("다 찬");
  });

  it("결제 승인이 실패하면 사용 횟수를 되돌린다", async () => {
    await createCoupon({ code: "BACK", percent: 10, maxUses: 1 }, NOW);
    const o = await createOrder(input, "a@b.co", "full", NOW, undefined, "010-1234-5678", ["email"], undefined, undefined, "BACK");
    vi.stubGlobal("fetch", toss({ code: "REJECT_CARD_PAYMENT", message: "한도 초과" }, 400));
    await expect(confirmOrder({ paymentKey: "pk", orderId: o.id, amount: o.amount })).rejects.toThrow();
    expect(await couponUses("BACK")).toBe(0);
  });
});
