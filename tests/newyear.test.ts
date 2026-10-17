import { beforeEach, describe, expect, it } from "vitest";
import { calculateSaju, type BirthInput } from "@/lib/saju/calc";
import { computeNewyear, newyearPrompt, samjae } from "@/lib/extras/newyear";
import { createOrder, OrderError } from "@/lib/orders";
import { createMemoryStore, setStoreForTest } from "@/lib/store";

const now = new Date("2026-10-15T03:00:00Z");
const me: BirthInput = { name: "홍길동", gender: "male", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 };

describe("삼재", () => {
  it("말띠(午)는 申酉戌 해", () => {
    expect(samjae("午", "申")).toBe("들삼재");
    expect(samjae("午", "酉")).toBe("눌삼재");
    expect(samjae("午", "戌")).toBe("날삼재");
    expect(samjae("午", "未")).toBeNull();
  });
  it("쥐띠(子)는 寅卯辰 해", () => {
    expect(samjae("子", "寅")).toBe("들삼재");
  });
});

describe("신년 운세록 계산", () => {
  const chart = calculateSaju(me, now);
  const c = computeNewyear(chart, 2027);
  it("2027년은 丁未", () => {
    expect(c.ganzhi).toBe("丁未");
    expect(c.months).toHaveLength(12);
    expect(c.months[0].branch).toBe("丑");
    expect(c.months[5].branch).toBe("午");
  });
  it("좋은 달 3개, 살필 달 2개가 겹치지 않는다", () => {
    expect(c.best).toHaveLength(3);
    expect(c.care).toHaveLength(2);
    expect(c.best.some((m) => c.care.includes(m))).toBe(false);
  });
  it("원국 네 지지와 일간을 모두 본다", () => {
    expect(c.withChart.map((w) => w.label)).toEqual(["일간", "년지", "월지", "일지", "시지"]);
    expect(JSON.stringify(newyearPrompt(chart, c))).toContain("2027년 丁未");
  });
});

describe("신년 운세록 주문", () => {
  beforeEach(() => setStoreForTest(createMemoryStore()));
  it("올해·내년만 받는다", async () => {
    await expect(createOrder(me, "a@b.co", "newyear", now, undefined, "01012345678", ["email"], { year: 2030 })).rejects.toBeInstanceOf(OrderError);
    const o = await createOrder(me, "a@b.co", "newyear", now, undefined, "01012345678", ["email"], { year: 2027 });
    expect(o.extra).toEqual({ kind: "newyear", request: { year: 2027 } });
  });
});
