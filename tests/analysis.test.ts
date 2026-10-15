import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/calc";
import { determineUsefulness, ganzhiScore, TEN_GOD_MODERN } from "@/lib/saju/analysis";

const now = new Date("2026-10-15T00:00:00Z");
const chart2000 = () =>
  calculateSaju(
    { gender: "male", calendar: "solar", year: 2000, month: 1, day: 1, hour: 12, minute: 0, options: { solarTimeCorrection: false } },
    now,
  );

describe("격국·용신", () => {
  it("2000-01-01 戊일 子월: 월지 정기 癸가 드러나지 않아 정재격", () => {
    const a = chart2000().analysis;
    expect(a.gyeokguk.name).toBe("정재격");
  });

  it("중화(58점)이면 원국에서 가장 부족한 오행(금)을 참고 용신으로", () => {
    const c = chart2000();
    expect(c.strength.score).toBe(58);
    expect(c.analysis.usefulness.yongsin).toBe("metal");
    expect(c.analysis.usefulness.huisin).toBe("earth");
    expect(c.analysis.usefulness.gisin).toBe("fire");
  });

  it("신약이면 인성·비겁, 신강이면 식상·재·관 중에서 고른다", () => {
    const w = { wood: 1, fire: 0.5, earth: 3, metal: 2, water: 1.5 };
    expect(["fire", "earth"]).toContain(determineUsefulness("earth", 20, w).yongsin);
    expect(["metal", "water", "wood"]).toContain(determineUsefulness("earth", 85, w).yongsin);
  });
});

describe("점수·월별 흐름·개운", () => {
  it("용신이 천간·지지에 모두 오면 최고점, 기신이면 최저점", () => {
    const u = { yongsin: "metal", huisin: "earth", gisin: "fire", method: "" } as const;
    expect(ganzhiScore("metal", "metal", u)).toBe(100);
    expect(ganzhiScore("fire", "fire", u)).toBe(0);
    expect(ganzhiScore("wood", "water", u)).toBe(50);
  });

  it("올해·내년 24개월, 2026년 2월은 庚寅월(입춘 2026-02-04)", () => {
    const a = chart2000().analysis;
    expect(a.reportYears).toEqual([2026, 2027]);
    expect(a.monthly).toHaveLength(24);
    const feb = a.monthly[1];
    expect(feb.stem + feb.branch).toBe("庚寅");
    expect(feb.startDate).toBe("2026-02-04");
    expect(a.yearScores.map((y) => y.ganzhi)).toEqual(["丙午", "丁未"]);
  });

  it("대운 점수는 대운 개수만큼, 개운 요소는 용신 오행 기준", () => {
    const c = chart2000();
    expect(c.analysis.daeunScores).toHaveLength(c.daeun.periods.length);
    expect(c.analysis.lucky.element).toBe("metal");
    expect(c.analysis.lucky.direction).toBe("서쪽");
  });

  it("십신 해석표는 원국에 있는 십신만, 현대적 표현과 함께", () => {
    const guide = chart2000().analysis.tenGodGuide;
    expect(guide.length).toBeGreaterThan(0);
    for (const g of guide) expect(g.modern).toBe(TEN_GOD_MODERN[g.god]);
    expect(TEN_GOD_MODERN.편재).toContain("프로젝트형 수익 창출력");
  });
});
