import { describe, expect, it } from "vitest";
import { calculateSaju, type BirthInput } from "@/lib/saju/calc";
import { GRADE_TIERS, tierFor } from "@/lib/saju/grade";
import stats from "@/lib/saju/grade-stats.json";

const now = new Date("2026-10-15T00:00:00Z");
const base: BirthInput = { gender: "female", calendar: "solar", year: 1978, month: 8, day: 8, hour: 10, minute: 0 };

describe("사주 등급", () => {
  it("다섯 단계 비율의 합은 100", () => {
    expect(GRADE_TIERS.reduce((s, t) => s + t.share, 0)).toBe(100);
  });

  it("상위 비율로 단계를 자른다", () => {
    expect(tierFor(0.5).level).toBe(1);
    expect(tierFor(3).level).toBe(1);
    expect(tierFor(3.1).level).toBe(2);
    expect(tierFor(50).level).toBe(3);
    expect(tierFor(85).level).toBe(4);
    expect(tierFor(99).level).toBe(5);
  });

  it("점수는 0~100이고 근거 점수의 합과 같다", () => {
    const g = calculateSaju(base, now).grade;
    const sum = Object.values(g.parts).reduce((s, v) => s + v, 0);
    expect(g.score).toBeGreaterThanOrEqual(0);
    expect(g.score).toBeLessThanOrEqual(100);
    expect(g.score).toBeCloseTo(sum, 1);
    expect(g.topPercent).toBeGreaterThan(0);
    expect(g.topPercent).toBeLessThanOrEqual(100);
  });

  it("같은 입력에는 항상 같은 등급", () => {
    expect(calculateSaju(base, now).grade).toEqual(calculateSaju(base, now).grade);
  });

  it("1978-08-08 壬寅일: 천을귀인(巳) 있음, 대운 전성기는 대운 목록 안", () => {
    const c = calculateSaju(base, now);
    expect(c.pillars.day.stem + c.pillars.day.branch).toBe("壬寅");
    expect(c.grade.nobles.find((n) => n.name === "천을귀인")?.has).toBe(true);
    expect(c.analysis.daeunScores.map((d) => d.startAge)).toContain(c.grade.peak?.startAge);
  });

  it("통계에 들어 있는 조합이면 희소도가 계산된다", () => {
    const c = calculateSaju(base, now);
    expect((stats.combos as Record<string, number>)[c.grade.rarity.key]).toBeGreaterThan(0);
    expect(c.grade.rarity.oneIn).toBeGreaterThan(1);
  });

  it("시각을 모르면 6글자 계산으로 표시", () => {
    expect(calculateSaju({ ...base, hour: null }, now).grade.partial).toBe(true);
  });

  it("통계 표본은 1960~2009년 전체(날짜 × 12시진 × 성별)", () => {
    expect(stats.total).toBe(18263 * 12 * 2);
    expect(stats.histogram.reduce((s: number, n: number) => s + n, 0)).toBe(stats.total);
  });
});
