import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/calc";
import { monthCalendar, monthFortune } from "@/lib/saju/monthly-fortune";

const chart = calculateSaju({ name: "홍길동", gender: "male", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 }, new Date("2026-10-25T03:00:00Z"));

describe("이달의 운세·길일 달력", () => {
  it("이달의 운세는 그달 월건과 내 일간의 십신·용신 부합도로 정한다", () => {
    const f = monthFortune(chart, 2026, 11);
    expect(f.ganzhi).toBe("己亥"); // 2026년 양력 11월 20일은 己亥월(입동~대설)
    expect(["좋음", "보통", "주의"]).toContain(f.mark);
    expect(f.title.length).toBeGreaterThan(3);
  });

  it("한 달의 모든 날을 표시하고, 목적을 고르면 길일과 피할 날을 고른다", () => {
    const cal = monthCalendar(chart, 2026, 11);
    expect(cal.days).toHaveLength(30);
    expect(cal.days[0]).toMatchObject({ date: "2026-11-01", day: 1, weekday: 0 });
    expect(cal.days.every((d) => d.pick === undefined)).toBe(true);
    const move = monthCalendar(chart, 2026, 11, "move");
    expect(move.purposeLabel).toBe("이사·입주");
    const picks = move.days.filter((d) => d.pick);
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.length).toBeLessThanOrEqual(7);
    expect(picks.every((d) => !d.avoid)).toBe(true);
  });
});
