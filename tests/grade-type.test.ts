import { describe, expect, it } from "vitest";
import { GRADE_TIERS, GRADE_TIERS_HANS, GRADE_TIERS_ZH } from "@/lib/saju/grade";
import { GLYPHS } from "@/lib/brand/glyphs";

describe("사주 유형(숫자 등급 대신)", () => {
  it("모든 유형에 이름과 도장 글자가 있고, 도장 글자는 경로로 그릴 수 있다", () => {
    for (const tiers of [GRADE_TIERS, GRADE_TIERS_ZH, GRADE_TIERS_HANS]) {
      for (const t of tiers) {
        expect(t.type.length).toBeGreaterThan(1);
        expect([...t.seal]).toHaveLength(2);
        for (const ch of t.seal) expect(GLYPHS[ch], ch).toBeTruthy();
      }
    }
  });

  it("유형 이름에 숫자 등급 표현이 없다", () => {
    for (const t of [...GRADE_TIERS, ...GRADE_TIERS_ZH, ...GRADE_TIERS_HANS]) {
      expect(t.type).not.toMatch(/등급|等級|等级|[0-9]/);
    }
  });
});

import { calculateSaju } from "@/lib/saju/calc";
import { chartForPrompt, chartForPromptZh } from "@/lib/reading";

describe("AI에 넘기는 명식", () => {
  it("숫자 등급과 하위권 순위를 넘기지 않는다", () => {
    const chart = calculateSaju({ gender: "male", calendar: "lunar", year: 1975, month: 10, day: 18, hour: 12, minute: 0 });
    const ko = JSON.stringify(chartForPrompt(chart));
    expect(ko).not.toMatch(/\d등급/);
    expect(ko).toContain(chart.grade.tier.type);
    if (chart.grade.topPercent > 15) expect(ko).not.toContain(`상위 ${chart.grade.topPercent}%`);
    const zh = JSON.stringify(chartForPromptZh({ ...chart }));
    expect(zh).not.toMatch(/第\d級/);
  });
});

describe("예전에 저장된 명식", () => {
  it("유형 이름이 없는 명식도 AI 지시문에 유형을 넣는다", async () => {
    const { calculateSaju } = await import("@/lib/saju/calc");
    const { chartForPrompt, chartForPromptZh, chartForPromptHans } = await import("@/lib/reading");
    const chart = calculateSaju({ gender: "male", calendar: "solar", year: 1975, month: 11, day: 20, hour: 12, minute: 0 });
    // 유형 필드가 생기기 전 저장본을 흉내 낸다.
    const old = { ...chart, grade: { ...chart.grade, tier: { level: chart.grade.tier.level, name: chart.grade.tier.name, desc: chart.grade.tier.desc, share: chart.grade.tier.share } } } as typeof chart;
    for (const data of [chartForPrompt(old), chartForPromptZh(old), chartForPromptHans(old)]) {
      expect(JSON.stringify(data)).not.toContain("undefined");
    }
  });
});
