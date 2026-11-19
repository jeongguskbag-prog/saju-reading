import { describe, expect, it } from "vitest";
import { Solar } from "lunar-javascript";
import { calculateSaju } from "../src/lib/saju/calc";
import { dayGanzhi, luckyColor } from "../src/lib/saju/lucky-color";

describe("오늘의 행운 색", () => {
  it("일진 계산이 만세력과 같다(1950~2060 여러 날)", () => {
    for (let t = Date.UTC(1950, 0, 1); t < Date.UTC(2060, 0, 1); t += 86_400_000 * 37) {
      const dt = new Date(t);
      const [y, m, d] = [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
      expect(dayGanzhi(y, m, d).join("")).toBe(Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi());
    }
  });

  it("기신 색을 행운 색으로 권하지 않고, 날마다 일진이 바뀐다", () => {
    const chart = calculateSaju({ gender: "female", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10 });
    const u = chart.analysis.usefulness;
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const c = luckyColor(chart, new Date(Date.UTC(2026, 10, 1 + i, 3)));
      expect(c.element).not.toBe(u.gisin);
      expect([u.yongsin, u.huisin]).toContain(c.element);
      expect(c.reason).toContain(c.ganzhi);
      seen.add(c.ganzhi);
    }
    expect(seen.size).toBe(20);
  });
});
