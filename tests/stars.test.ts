import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/calc";
import { computeStars } from "@/lib/extras/stars";
import { PRODUCTS, sellableProducts } from "@/lib/product";
import { releaseMinutes } from "@/lib/release";
import { isExtraKind } from "@/lib/extras/kinds";

const NOW = new Date("2026-11-20T03:00:00Z");
const charts = [1960, 1975, 1985, 1990, 1999].flatMap((year) =>
  (["male", "female"] as const).map((gender) => calculateSaju({ name: "홍길동", gender, calendar: "solar", year, month: 5, day: 15, hour: 10, minute: 30 }, NOW)),
);

describe("재물운·커리어 숏 감정서", () => {
  it("상품: 각 6,900원, 약 20분 뒤 발송, 판매 목록에 있다", () => {
    for (const id of ["money", "career"] as const) {
      expect(isExtraKind(id)).toBe(true);
      expect(PRODUCTS[id].price).toBe(6900);
      expect(PRODUCTS[id].parts).toEqual([id]);
      expect(releaseMinutes(id)).toBe(20);
      expect(sellableProducts().some((p) => p.id === id)).toBe(true);
    }
  });

  it("재물운은 재성·식상·비겁, 커리어는 관성·인성·상관을 센다", () => {
    for (const chart of charts) {
      const m = computeStars(chart, "money", NOW);
      expect(m.main.name).toContain("재성");
      expect(m.main.count).toBe((chart.tenGodCounts.정재 ?? 0) + (chart.tenGodCounts.편재 ?? 0));
      const c = computeStars(chart, "career", NOW);
      expect(c.main.name).toContain("관성");
      expect(c.rival.count).toBe(chart.tenGodCounts.상관 ?? 0);
      for (const s of [m, c]) {
        expect(s.years.every((y) => /^202[678]년$/.test(y.label) && y.reasons.length > 0)).toBe(true);
        expect(s.daeun.length).toBeGreaterThan(0);
        expect(s.daeun.length).toBeLessThanOrEqual(2);
      }
    }
  });
});
