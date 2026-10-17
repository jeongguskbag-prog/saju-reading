import { beforeEach, describe, expect, it } from "vitest";
import { calculateSaju, type BirthInput } from "@/lib/saju/calc";
import { computeZiwei, timeIndex, ZiweiError } from "@/lib/extras/ziwei";
import { createOrder, OrderError } from "@/lib/orders";
import { createMemoryStore, setStoreForTest } from "@/lib/store";

const now = new Date("2026-10-15T03:00:00Z");
const me: BirthInput = { name: "홍길동", gender: "female", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 };

describe("자미두수", () => {
  it("시진 번호", () => {
    expect([0, 1, 2, 9, 10, 22, 23].map(timeIndex)).toEqual([0, 1, 1, 5, 5, 11, 12]);
  });
  it("열두 궁, 명궁 하나, 신궁 하나, 14주성 모두", () => {
    const c = computeZiwei(calculateSaju(me, now), now);
    expect(c.palaces).toHaveLength(12);
    expect(c.palaces.filter((p) => p.name === "명궁")).toHaveLength(1);
    expect(c.palaces.filter((p) => p.body)).toHaveLength(1);
    expect(c.palaces.flatMap((p) => p.major)).toHaveLength(14);
    expect(new Set(c.palaces.map((p) => p.branch)).size).toBe(12);
    expect(c.natalMutagens.map((m) => m.mutagen).sort()).toEqual(["화과", "화권", "화기", "화록"]);
    expect(c.nominalAge).toBe(37);
    // 진태양시 09:57 → 사시
    expect(c.timeLabel).toContain("09:57");
  });
  it("시각을 모르면 세우지 않는다", () => {
    expect(() => computeZiwei(calculateSaju({ ...me, hour: null }, now), now)).toThrow(ZiweiError);
  });
});

describe("자미두수 주문", () => {
  beforeEach(() => setStoreForTest(createMemoryStore()));
  it("시각이 없으면 주문을 만들지 않는다", async () => {
    await expect(createOrder({ ...me, hour: null }, "a@b.co", "ziwei", now, undefined, "01012345678", ["email"], {})).rejects.toBeInstanceOf(OrderError);
    const o = await createOrder(me, "a@b.co", "ziwei", now, undefined, "01012345678", ["email"], {});
    expect(o.extra?.kind).toBe("ziwei");
  });
});
