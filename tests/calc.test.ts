import { describe, expect, it } from "vitest";
import {
  calculateSaju,
  InputError,
  koreaUtcOffsetMinutes,
  tenGod,
  yearGanZhi,
  type BirthInput,
} from "@/lib/saju/calc";
import { BRANCHES, STEMS } from "@/lib/saju/constants";

const base = (over: Partial<BirthInput>): BirthInput => ({
  gender: "male",
  calendar: "solar",
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  ...over,
});

const gz = (p: { stem: string; branch: string } | null) => (p ? p.stem + p.branch : null);

/** 독립 검증용: 율리우스 적일로 일진 계산 (2000-01-01 = 戊午). */
function dayGanZhiByJdn(y: number, m: number, d: number): string {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn =
    d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  const idx = (((jdn + 49) % 60) + 60) % 60;
  return STEMS[idx % 10] + BRANCHES[idx % 12];
}

describe("사주 네 기둥", () => {
  it("2000-01-01 12:00 → 己卯년 丙子월 戊午일 戊午시", () => {
    const c = calculateSaju(base({ options: { solarTimeCorrection: false } }));
    expect(gz(c.pillars.year)).toBe("己卯");
    expect(gz(c.pillars.month)).toBe("丙子");
    expect(gz(c.pillars.day)).toBe("戊午");
    expect(gz(c.pillars.hour)).toBe("戊午");
    expect(c.zodiac).toBe("토끼");
  });

  it("일주는 율리우스 적일 공식과 일치한다(1900~2100 표본)", () => {
    for (let y = 1901; y <= 2099; y += 7) {
      for (const [m, d] of [[1, 15], [4, 30], [8, 8], [12, 31]]) {
        const c = calculateSaju(base({ year: y, month: m, day: d, hour: null }));
        expect(gz(c.pillars.day), `${y}-${m}-${d}`).toBe(dayGanZhiByJdn(y, m, d));
      }
    }
  });

  it("입춘 직전·직후로 년주와 월주가 바뀐다 (1984 입춘 = KST 2월 5일 00:18)", () => {
    const before = calculateSaju(base({ year: 1984, month: 2, day: 5, hour: 0, minute: 10 }));
    expect(gz(before.pillars.year)).toBe("癸亥");
    expect(gz(before.pillars.month)).toBe("乙丑");
    const after = calculateSaju(base({ year: 1984, month: 2, day: 5, hour: 0, minute: 30 }));
    expect(gz(after.pillars.year)).toBe("甲子");
    expect(gz(after.pillars.month)).toBe("丙寅");
    expect(after.zodiac).toBe("쥐");
  });

  it("양력 1월생은 설날이 아니라 입춘 기준으로 전년도 년주를 쓴다", () => {
    const c = calculateSaju(base({ year: 2024, month: 1, day: 20 }));
    expect(gz(c.pillars.year)).toBe("癸卯");
    expect(gz(c.pillars.month)).toBe("乙丑");
  });

  it("시주는 일간에 따라 시작 천간이 정해진다 (戊일 자시 → 壬子)", () => {
    const c = calculateSaju(base({ year: 2000, month: 1, day: 1, hour: 0, minute: 30, options: { solarTimeCorrection: false } }));
    expect(gz(c.pillars.day)).toBe("戊午");
    expect(gz(c.pillars.hour)).toBe("壬子");
  });

  it("23시 출생: 기본은 다음 날 일주, 야자시 옵션이면 당일 일주", () => {
    const at23 = calculateSaju(base({ hour: 23, minute: 30, options: { solarTimeCorrection: false } }));
    expect(gz(at23.pillars.day)).toBe("己未");
    const at0 = calculateSaju(base({ hour: 23, minute: 30, options: { solarTimeCorrection: false, dayBoundary: "at0" } }));
    expect(gz(at0.pillars.day)).toBe("戊午");
  });

  it("진태양시 보정(서울 약 -32분)으로 시주 경계가 바뀐다", () => {
    // 13:20 KST → 평균태양시 12:48 → 午시. 보정 없으면 未시.
    const on = calculateSaju(base({ hour: 13, minute: 20 }));
    expect(on.pillars.hour?.branch).toBe("午");
    const off = calculateSaju(base({ hour: 13, minute: 20, options: { solarTimeCorrection: false } }));
    expect(off.pillars.hour?.branch).toBe("未");
  });

  it("1988년 서머타임 기간은 1시간을 빼고 계산한다", () => {
    expect(koreaUtcOffsetMinutes(1988, 7, 1, 13, 20)).toBe(600);
    const c = calculateSaju(base({ year: 1988, month: 7, day: 1, hour: 13, minute: 20, options: { solarTimeCorrection: false } }));
    expect(c.pillars.hour?.branch).toBe("午");
    expect(c.warnings.some((w) => w.includes("서머타임"))).toBe(true);
  });
});

describe("음력 입력", () => {
  it("음력 2024-01-01은 양력 2024-02-10(甲辰일)", () => {
    const c = calculateSaju(base({ calendar: "lunar", year: 2024, month: 1, day: 1, hour: null }));
    expect(c.solarDate).toBe("2024-02-10");
    expect(gz(c.pillars.day)).toBe("甲辰");
    expect(gz(c.pillars.year)).toBe("甲辰");
  });

  it("윤달을 구분한다 (2023 윤2월 1일 = 양력 3월 22일)", () => {
    const leap = calculateSaju(base({ calendar: "lunar", year: 2023, month: 2, day: 1, isLeapMonth: true, hour: null }));
    expect(leap.solarDate).toBe("2023-03-22");
    expect(leap.lunarDate).toBe("2023년 윤2월 1일");
    const normal = calculateSaju(base({ calendar: "lunar", year: 2023, month: 2, day: 1, hour: null }));
    expect(normal.solarDate).toBe("2023-02-20");
  });

  it("없는 윤달·날짜는 오류", () => {
    expect(() => calculateSaju(base({ calendar: "lunar", year: 2024, month: 2, day: 1, isLeapMonth: true }))).toThrow(InputError);
    expect(() => calculateSaju(base({ year: 2023, month: 2, day: 29 }))).toThrow(InputError);
  });
});

describe("십신·오행·대운", () => {
  it("십신 관계", () => {
    expect(tenGod("戊", "戊")).toBe("비견");
    expect(tenGod("戊", "己")).toBe("겁재");
    expect(tenGod("戊", "庚")).toBe("식신");
    expect(tenGod("戊", "辛")).toBe("상관");
    expect(tenGod("戊", "壬")).toBe("편재");
    expect(tenGod("戊", "癸")).toBe("정재");
    expect(tenGod("戊", "甲")).toBe("편관");
    expect(tenGod("戊", "乙")).toBe("정관");
    expect(tenGod("戊", "丙")).toBe("편인");
    expect(tenGod("戊", "丁")).toBe("정인");
  });

  it("2000-01-01 명식의 십신과 오행 분포", () => {
    const c = calculateSaju(base({ options: { solarTimeCorrection: false } }));
    expect(c.pillars.year.stemTenGod).toBe("겁재"); // 己
    expect(c.pillars.month.stemTenGod).toBe("편인"); // 丙
    expect(c.pillars.day.stemTenGod).toBeNull();
    expect(c.pillars.day.branchTenGod).toBe("정인"); // 午 정기 丁
    expect(c.elements.counts).toEqual({ wood: 1, fire: 3, earth: 3, metal: 0, water: 1 });
    const weightedSum = Object.values(c.elements.weighted).reduce((a, b) => a + b, 0);
    expect(weightedSum).toBeCloseTo(8, 1);
  });

  it("양년생 남자는 순행, 음년생(己卯) 남자는 역행 대운", () => {
    const c = calculateSaju(base({ options: { solarTimeCorrection: false } }));
    expect(c.daeun.forward).toBe(false);
    expect(c.daeun.periods.map((p) => p.stem + p.branch).slice(0, 3)).toEqual(["乙亥", "甲戌", "癸酉"]);
    expect(c.daeun.startAge).toBe(8);
    expect(c.daeun.periods).toHaveLength(8);

    const f = calculateSaju(base({ gender: "female", options: { solarTimeCorrection: false } }));
    expect(f.daeun.forward).toBe(true);
    expect(f.daeun.periods[0].stem + f.daeun.periods[0].branch).toBe("丁丑");
  });

  it("시각을 모르면 6글자로 계산", () => {
    const c = calculateSaju(base({ hour: null }));
    expect(c.pillars.hour).toBeNull();
    const total = Object.values(c.elements.counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(6);
  });

  it("세운 간지", () => {
    expect(yearGanZhi(2026).join("")).toBe("丙午");
    expect(yearGanZhi(1984).join("")).toBe("甲子");
    const c = calculateSaju(base({}), new Date("2026-10-14T00:00:00Z"));
    expect(c.yearLuck.ko).toBe("병오");
    expect(c.daeun.current?.startYear).toBeLessThanOrEqual(2026);
  });
});
