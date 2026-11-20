import { describe, expect, it } from "vitest";
import { calculateSaju, type BirthInput } from "../src/lib/saju/calc";
import { recommendFor } from "../src/lib/saju/recommend";

const base: BirthInput = { name: "홍길동", gender: "male", calendar: "solar", year: 1985, month: 3, day: 15, hour: 10 };
const now = new Date("2026-11-20T00:00:00Z");

describe("무료 결과 맞춤 추천", () => {
  it("최대 2개, 상품이 겹치지 않고, 이유가 있다", () => {
    for (const y of [1960, 1975, 1985, 1990, 1999, 2004]) {
      for (const gender of ["male", "female"] as const) {
        const recs = recommendFor(calculateSaju({ ...base, year: y, gender }, now), now);
        expect(recs.length).toBeGreaterThan(0);
        expect(recs.length).toBeLessThanOrEqual(2);
        expect(new Set(recs.map((r) => r.product)).size).toBe(recs.length);
        for (const r of recs) expect(r.reason.length).toBeGreaterThan(20);
      }
    }
  });

  it("결혼했다고 알려 주면 연애운 대신 궁합을 추천한다", () => {
    const recs = recommendFor(calculateSaju({ ...base, life: { marital: "married" } }, now), now);
    expect(recs.some((r) => r.product === "love")).toBe(false);
    expect(recs.some((r) => r.product === "gunghap")).toBe(true);
  });

  it("11월에는 다음 해 신년 운세가 후보에 든다", () => {
    const all = recommendFor(calculateSaju(base, now), now, ["newyear"]);
    expect(all[0]).toMatchObject({ product: "newyear" });
    expect(all[0].title).toContain("2027년");
  });

  it("11월에는 저무는 올해 대신 내년부터 인연 시기를 본다", () => {
    for (const y of [1980, 1985, 1990, 1995]) {
      const love = recommendFor(calculateSaju({ ...base, year: y }, now), now, ["love"])[0];
      if (love?.product === "love") expect(love.title).not.toContain("2026년");
    }
  });

  it("팔지 않는 상품은 추천하지 않는다", () => {
    const recs = recommendFor(calculateSaju(base, now), now, ["core"]);
    expect(recs.every((r) => r.product === "core")).toBe(true);
  });

  it("대운이 2년 안에 바뀌면 종합 감정서를 먼저 추천한다", () => {
    let found = 0;
    for (let y = 1960; y <= 2005; y++) {
      const chart = calculateSaju({ ...base, year: y }, now);
      const next = chart.daeun.periods.find((p) => p.startYear > 2026);
      const recs = recommendFor(chart, now, ["full", "love", "money", "career", "newyear", "core", "gunghap"]);
      if (next && next.startYear - 2026 <= 2) {
        found++;
        expect(recs[0]).toMatchObject({ product: "full" });
        expect(recs[0].title).toContain(`${next.startYear}년`);
      } else expect(recs.some((r) => r.product === "full")).toBe(false);
    }
    expect(found).toBeGreaterThan(0);
  });
});
