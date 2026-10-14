import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/calc";
import { chartForPrompt } from "@/lib/reading";
import { readingSchema } from "@/lib/reading-shared";

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
    expect(data.올해).toContain("丙午");
  });

  it("풀이 응답 스키마는 다섯 항목을 모두 요구한다", () => {
    const section = { body: "본문", tips: ["팁"] };
    const ok = { summary: "요약", personality: section, wealth: section, love: section, health: section, thisYear: section };
    expect(readingSchema.safeParse(ok).success).toBe(true);
    const { health: _omit, ...missing } = ok;
    expect(readingSchema.safeParse(missing).success).toBe(false);
  });
});
