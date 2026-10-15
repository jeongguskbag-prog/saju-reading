import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/calc";
import { chartForPrompt } from "@/lib/reading";
import { chapterSchema, introSchema } from "@/lib/report-shared";

describe("AI 입력 데이터", () => {
  it("이름은 AI에 보내지 않고, 명식 값은 그대로 전달한다", () => {
    const chart = calculateSaju(
      { name: "홍길동", gender: "male", calendar: "solar", year: 2000, month: 1, day: 1, hour: 12, minute: 0, options: { solarTimeCorrection: false } },
      new Date("2026-10-14T00:00:00Z"),
    );
    const data = chartForPrompt(chart);
    const json = JSON.stringify(data);
    expect(json).not.toContain("홍길동");
    expect(data.원국.일주?.간지).toBe("戊午(무오)");
    expect(data.원국.년주?.천간.십신).toBe("겁재");
    expect(data.세운[0]).toContain("丙午");
    expect(data.격국).toContain("정재격");
    expect(data.월별흐름).toHaveLength(24);
  });

  it("파트 응답 스키마: 소제목·문단이 있어야 하고 빈 문단은 거부", () => {
    const ok = { sections: [{ heading: "제목", paragraphs: ["문단"] }], actionPlan: ["실천"] };
    expect(chapterSchema.safeParse(ok).success).toBe(true);
    expect(chapterSchema.safeParse({ sections: [], actionPlan: [] }).success).toBe(false);
    expect(chapterSchema.safeParse({ sections: [{ heading: "제목", paragraphs: [""] }], actionPlan: [] }).success).toBe(false);
    expect(introSchema.safeParse({ coverKeywords: ["키워드"], summary: "요약", preface: ["발간사"] }).success).toBe(true);
  });
});
