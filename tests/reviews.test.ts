import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput } from "@/lib/saju/calc";
import { confirmOrder, createOrder, getReport, savePart } from "@/lib/orders";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import { listReviews, maskName, reviewSummary, setReviewHidden, submitReview } from "@/lib/reviews";
import type { PartResult } from "@/lib/report-shared";

const input: BirthInput = { name: "박정구", gender: "male", calendar: "solar", year: 1975, month: 11, day: 20, hour: 9, minute: 0 };
const now = new Date("2026-10-15T03:00:00Z");
const json = (b: object) => new Response(JSON.stringify(b), { status: 200, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function paidReport(name = "박정구") {
  const order = await createOrder({ ...input, name }, "a@b.co", "core", now, undefined, "010-1234-5678", ["email"]);
  vi.stubGlobal("fetch", vi.fn(async () => json({ orderId: order.id, status: "DONE", totalAmount: order.amount, approvedAt: now.toISOString() })));
  const { order: paid } = await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount });
  return paid.token!;
}
const fill = async (token: string) => {
  const r = (await getReport(token, now))!;
  for (const p of r.product.parts) await savePart(token, p, { part: p } as unknown as PartResult);
};

describe("의뢰인 후기", () => {
  it("이름 가운데를 가린다", () => {
    expect(maskName("박정구")).toBe("박*구");
    expect(maskName("김민")).toBe("김*");
    expect(maskName("남궁민수")).toBe("남**수");
    expect(maskName("")).toBe("의뢰인");
  });

  it("감정서가 완성된 결제 주문만, 한 주문에 한 건(고쳐 쓰기)", async () => {
    const token = await paidReport();
    await expect(submitReview(token, 5, "좋았어요 감사합니다", now)).rejects.toThrow("완성");
    await fill(token);
    await expect(submitReview(token, 0, "좋았어요 감사합니다", now)).rejects.toThrow("별점");
    await expect(submitReview(token, 5, "짧음", now)).rejects.toThrow("5자");
    const r = await submitReview(token, 5, "  풀이가 자세해서 좋았어요\n\n\n\n감사합니다  ", now);
    expect(r).toMatchObject({ name: "박*구", rating: 5, text: "풀이가 자세해서 좋았어요\n\n감사합니다", product: "천기록 핵심 명식록" });
    await submitReview(token, 4, "다시 읽어 보니 더 좋네요", now);
    const list = await listReviews();
    expect(list).toHaveLength(1);
    expect(list[0].rating).toBe(4);
    await expect(submitReview("x".repeat(32), 5, "가짜 후기입니다", now)).rejects.toThrow("찾을 수 없");
  });

  it("숨긴 후기는 첫 화면 목록에서 빠지고, 평균을 낸다", async () => {
    const a = await paidReport("김철수");
    const b = await paidReport("이영희");
    await fill(a);
    await fill(b);
    await submitReview(a, 5, "아주 만족합니다", now);
    const rb = await submitReview(b, 3, "보통이었어요", now);
    expect(reviewSummary(await listReviews())).toEqual({ count: 2, average: 4 });
    await setReviewHidden(rb.orderId, true);
    expect((await listReviews()).map((r) => r.name)).toEqual(["김*수"]);
    expect(await listReviews({ includeHidden: true })).toHaveLength(2);
  });
});

describe("결혼·자녀(선택)", async () => {
  const { parseBirthInput } = await import("@/lib/input");
  const { lifeForPrompt, chartForPrompt } = await import("@/lib/reading");
  const { calculateSaju } = await import("@/lib/saju/calc");
  it("입력을 받고, 감정서 풀이 자료에 상황을 넣는다(없으면 넣지 않는다)", () => {
    const ok = parseBirthInput({ ...input, life: { marital: "married", children: true } });
    expect(ok.ok).toBe(true);
    expect(parseBirthInput({ ...input, life: { marital: "divorced" } }).ok).toBe(false);
    expect(lifeForPrompt({ marital: "single", children: false })).toEqual({ 생활상황: "싱글, 자녀 없음" });
    expect(lifeForPrompt({ children: true })).toEqual({ 생활상황: "자녀 있음" });
    expect(lifeForPrompt(undefined)).toEqual({});
    expect(chartForPrompt(calculateSaju({ ...input, life: { marital: "dating" } }, now))).toMatchObject({ 생활상황: "연애 중" });
    expect("생활상황" in chartForPrompt(calculateSaju(input, now))).toBe(false);
  });
});
