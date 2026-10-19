import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGiftOrder, getGift, isGiftProduct, redeemGift } from "@/lib/gift";
import { cancelOrder, confirmOrder, getOrder, getReport } from "@/lib/orders";
import { giftReceiptText } from "@/lib/receipt";
import { createMemoryStore, requireStore, setStoreForTest } from "@/lib/store";
import { claimOrder, findOrCreateMember } from "@/lib/member";
import type { BirthInput } from "@/lib/saju/calc";

const input: BirthInput = { name: "김어머니", gender: "female", calendar: "solar", year: 1960, month: 3, day: 3, hour: 9, minute: 0 };
const toss = (body: object, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
  vi.stubEnv("KAKAO_REST_API_KEY", "k");
  vi.stubEnv("MEMBER_SESSION_SECRET", "x".repeat(40));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function paidGift() {
  const order = await createGiftOrder({ productId: "full", from: "큰딸", to: "어머니", message: "늘 건강하세요", email: "a@b.co", phone: "010-1234-5678", targets: ["email"] });
  vi.stubGlobal("fetch", toss({ orderId: order.id, status: "DONE", totalAmount: order.amount }));
  return (await confirmOrder({ paymentKey: "pk_g", orderId: order.id, amount: order.amount })).order;
}

describe("감정서 선물", () => {
  it("선물할 수 있는 상품만 고를 수 있다", async () => {
    expect(isGiftProduct("full")).toBe(true);
    expect(isGiftProduct("gunghap")).toBe(false);
    await expect(createGiftOrder({ productId: "gunghap", from: "a", to: "b", email: "", phone: "010-1234-5678", targets: ["sms"] })).rejects.toThrow("선물할 수 없는");
    await expect(createGiftOrder({ productId: "full", from: "", to: "b", email: "", phone: "010-1234-5678", targets: ["email"] })).rejects.toThrow("보내는 분");
  });

  it("결제하면 선물 링크가 열리고, 선물 주문에는 감정서가 없다", async () => {
    const paid = await paidGift();
    expect(paid.amount).toBe(49000);
    expect(paid.releaseAt).toBeUndefined();
    expect(await getReport(paid.token!)).toBeNull();
    const gift = await getGift(paid.gift!.code);
    expect(gift?.id).toBe(paid.id);
    expect(giftReceiptText(paid, "https://x.test")).toContain(`https://x.test/gift/${paid.gift!.code}`);
  });

  it("받는 분이 생년월일시를 넣으면 0원 선물 감정서가 만들어지고, 한 번만 받는다", async () => {
    const paid = await paidGift();
    const { order, created } = await redeemGift(paid.gift!.code, input, { email: "m@b.co", phone: "010-9999-8888", targets: ["email"] });
    expect(created).toBe(true);
    expect(order.amount).toBe(0);
    expect(order.method).toBe("선물");
    expect(order.giftOrderId).toBe(paid.id);
    expect(order.releaseAt).toBeTruthy();
    const report = await getReport(order.token!);
    expect(report?.chart.input.name).toBe("김어머니");
    // 다시 받으면 같은 감정서
    const again = await redeemGift(paid.gift!.code, { ...input, name: "다른 사람" }, { email: "x@b.co", targets: ["email"] });
    expect(again.created).toBe(false);
    expect(again.order.id).toBe(order.id);
    expect((await getOrder(paid.id))?.gift?.redeemedOrderId).toBe(order.id);
    // 받은 선물은 취소할 수 없다.
    await expect(cancelOrder(paid.id, "x")).rejects.toThrow("이미 사용한 선물");
  });

  it("취소한 선물 링크는 열리지 않는다", async () => {
    const paid = await paidGift();
    vi.stubGlobal("fetch", toss({ status: "CANCELED" }));
    await cancelOrder(paid.id, "고객 요청");
    expect(await getGift(paid.gift!.code)).toBeNull();
    await expect(redeemGift(paid.gift!.code, input, { email: "m@b.co", targets: ["email"] })).rejects.toThrow("찾을 수 없습니다");
  });

  it("선물 결제 주문은 보관함에 넣을 수 없다", async () => {
    const paid = await paidGift();
    const { member } = await findOrCreateMember("kakao", "g1", "a");
    await expect(claimOrder(member.id, paid.id, "a@b.co")).rejects.toThrow("선물 주문은");
  });

  it("받는 중인 선물은 취소하지 않고, 취소 중인 선물은 받지 못한다", async () => {
    const paid = await paidGift();
    await requireStore().setIfAbsent(`gift-redeem:${paid.gift!.code}`, "x", 600);
    await expect(cancelOrder(paid.id, "x")).rejects.toThrow("받는 중");
    await expect(redeemGift(paid.gift!.code, input, { email: "m@b.co", targets: ["email"] })).rejects.toThrow("받는 중");
  });
});
