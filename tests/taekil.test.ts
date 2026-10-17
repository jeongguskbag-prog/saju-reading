import { beforeEach, describe, expect, it } from "vitest";
import { calculateSaju, type BirthInput } from "@/lib/saju/calc";
import { computeTaekil } from "@/lib/extras/taekil";
import { checkTaekilRange } from "@/lib/extras/requests";
import { createOrder, OrderError } from "@/lib/orders";
import { createMemoryStore, setStoreForTest } from "@/lib/store";

const now = new Date("2026-10-15T03:00:00Z");
const me: BirthInput = { name: "홍길동", gender: "male", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 };

describe("택일 기간", () => {
  it("내일부터, 92일까지", () => {
    expect(checkTaekilRange("2026-10-15", "2026-10-20", now)).toContain("내일");
    expect(checkTaekilRange("2026-10-16", "2026-10-20", now)).toBeNull();
    expect(checkTaekilRange("2026-11-01", "2027-03-01", now)).toContain("92");
    expect(checkTaekilRange("2026-11-31", "2026-12-01", now)).toContain("날짜");
  });
});

describe("택일 계산", () => {
  const chart = calculateSaju(me, now);
  const c = computeTaekil(chart, { purpose: "move", start: "2026-11-01", end: "2026-12-31" });
  it("기간의 모든 날을 보고, 추천일은 제외일이 아니다", () => {
    expect(c.days).toHaveLength(61);
    expect(c.picks.length).toBeGreaterThan(0);
    expect(c.picks.length).toBeLessThanOrEqual(7);
    for (const p of c.picks) expect(c.days.find((d) => d.date === p)!.excluded).toBeNull();
  });
  it("일지와 충하는 날과 이사를 꺼리는 날은 뺀다", () => {
    for (const d of c.days) {
      if (d.withDay.some((r) => r.name === "충")) expect(d.excluded).not.toBeNull();
      if (d.ji.includes("移徙") || d.ji.includes("入宅")) expect(d.excluded).not.toBeNull();
    }
  });
  it("날짜와 일진 형식", () => {
    const d = c.days[0];
    expect(d.date).toBe("2026-11-01");
    expect(d.ganzhi).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  });
  it("주말만", () => {
    const w = computeTaekil(chart, { purpose: "wedding", start: "2026-11-01", end: "2026-11-30", weekendsOnly: true });
    expect(w.days.every((d) => d.weekday === 0 || d.weekday === 6)).toBe(true);
  });
});

describe("택일 주문", () => {
  beforeEach(() => setStoreForTest(createMemoryStore()));
  it("기간이 이상하면 주문을 만들지 않는다", async () => {
    await expect(createOrder(me, "a@b.co", "taekil", now, undefined, "01012345678", ["email"], { purpose: "move", start: "2026-10-10", end: "2026-10-20" })).rejects.toBeInstanceOf(OrderError);
    const o = await createOrder(me, "a@b.co", "taekil", now, undefined, "01012345678", ["email"], { purpose: "move", start: "2026-11-01", end: "2026-11-30" });
    expect(o.amount).toBe(29000);
  });
});
