import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/calc";
import { buildGlance, glanceYear } from "@/lib/extras/glance";
import { PRODUCTS } from "@/lib/product";
import { releaseMinutes } from "@/lib/release";
import { discountFor } from "@/lib/coupon";

describe("990원 한 장 운세", () => {
  it("상품: 990원, 약 5분 뒤, 쿠폰은 할인되지 않는다(최소 결제 금액)", () => {
    expect(PRODUCTS.glance.price).toBe(990);
    expect(releaseMinutes("glance")).toBe(5);
    expect(discountFor({ percent: 50 }, 990)).toBe(0);
  });

  it("11~12월에는 다음 해, 2~10월에는 올해", () => {
    expect(glanceYear(new Date("2026-11-20T03:00:00Z"))).toBe(2027);
    expect(glanceYear(new Date("2027-01-10T03:00:00Z"))).toBe(2027);
    expect(glanceYear(new Date("2026-06-10T03:00:00Z"))).toBe(2026);
  });

  it("AI 없이 계산과 문장으로 한 장을 만든다", () => {
    for (const year of [1965, 1980, 1990, 2001]) {
      for (const gender of ["male", "female"] as const) {
        const chart = calculateSaju({ name: "홍길동", gender, calendar: "solar", year, month: 7, day: 3, hour: 9 });
        const g = buildGlance(chart, new Date("2026-11-20T03:00:00Z"));
        expect(g.kind).toBe("glance");
        expect(g.computed.year).toBe(2027);
        expect(g.text.sections).toHaveLength(3);
        expect(g.text.sections[1].paragraphs.join(" ")).toMatch(/연애 —.*재물 —.*일 —/);
        expect(g.computed.best).toHaveLength(3);
        expect(g.text.summary).toContain("2027년");
      }
    }
  });
});
