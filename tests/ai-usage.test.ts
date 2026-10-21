import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { costKrw, orderUsage, recordUsage, usageDays, withUsageContext } from "@/lib/ai-usage";
import { createMemoryStore, setStoreForTest } from "@/lib/store";

beforeEach(() => setStoreForTest(createMemoryStore()));
afterEach(() => vi.unstubAllEnvs());

describe("AI 비용 기록", () => {
  it("단가와 환율로 원화 비용을 추정한다", () => {
    // 입력 100만 토큰 4달러 + 출력 10만 토큰 2달러 = 6달러 × 1400
    expect(costKrw([{ i: 1_000_000, out: 100_000, cw: 0, cr: 0 }])).toBe(8400);
    vi.stubEnv("AI_PRICE_USD", "5,25");
    vi.stubEnv("AI_KRW_PER_USD", "1000");
    expect(costKrw([{ i: 1_000_000, out: 0, cw: 0, cr: 1_000_000 }])).toBe(5500);
  });

  it("감정서 작업 안의 호출은 주문별로, 모든 호출은 날짜별로 모은다", async () => {
    await withUsageContext({ orderId: "CGR-1", kind: "report" }, async () => {
      await recordUsage({ input_tokens: 10_000, output_tokens: 5_000 }, "m");
      await recordUsage({ input_tokens: 10_000, output_tokens: 5_000 }, "m");
    });
    await recordUsage({ input_tokens: 1000, output_tokens: 1000 }, "m", "consult");
    const o = await orderUsage("CGR-1");
    expect(o?.calls).toBe(2);
    expect(o?.krw).toBe(costKrw([{ i: 20_000, out: 10_000, cw: 0, cr: 0 }]));
    const [today] = await usageDays(1);
    expect(today.calls).toBe(3);
    expect(Object.keys(today.byKind).sort()).toEqual(["consult", "report"]);
    expect(await orderUsage("CGR-2")).toBeNull();
  });
});
