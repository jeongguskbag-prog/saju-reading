import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/calc";
import { computeLove, lovePrompt, peachBranch } from "@/lib/extras/love";
import { PRODUCTS } from "@/lib/product";
import { releaseMinutes } from "@/lib/release";

const NOW = new Date("2026-10-25T03:00:00Z");
const male = calculateSaju({ name: "홍길동", gender: "male", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 }, NOW);
const female = calculateSaju({ name: "김영희", gender: "female", calendar: "solar", year: 1994, month: 2, day: 8, hour: null, minute: null }, NOW);

describe("연애운 숏 감정서", () => {
  it("상품: 6,900원, 약 20분 뒤 발송", () => {
    expect(PRODUCTS.love.price).toBe(6900);
    expect(PRODUCTS.love.parts).toEqual(["love"]);
    expect(releaseMinutes("love")).toBe(20);
  });

  it("도화는 삼합 무리로 정한다", () => {
    expect(peachBranch("子")).toBe("酉");
    expect(peachBranch("午")).toBe("卯");
    expect(peachBranch("酉")).toBe("午");
    expect(peachBranch("卯")).toBe("子");
  });

  it("남성은 재성, 여성은 관성을 배우자성으로 보고 인연 시기를 근거와 함께 고른다", () => {
    const m = computeLove(male, NOW);
    expect(m.spouseStar.gods).toEqual(["정재", "편재"]);
    const f = computeLove(female, NOW);
    expect(f.spouseStar.gods).toEqual(["정관", "편관"]);
    for (const c of [m, f]) {
      expect(c.months.length).toBeLessThanOrEqual(4);
      for (const t of [...c.years, ...c.months]) expect(t.reasons.length).toBeGreaterThan(0);
      expect(c.years.every((y) => /^202[678]년$/.test(y.label))).toBe(true);
      expect(c.goodAnimals.length).toBeGreaterThan(0);
    }
    expect(lovePrompt(male, m).성별).toBe("남성");
  });
});

describe("연애운 인연 달 순서", () => {
  it("인연이 드는 달은 시간 순서로 정렬한다", () => {
    for (const c of [computeLove(male, NOW), computeLove(female, NOW)]) {
      const order = c.months.map((m) => {
        const [, y, mo] = /(\d+)년 (\d+)월/.exec(m.label)!;
        return Number(y) * 100 + Number(mo);
      });
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });
});
