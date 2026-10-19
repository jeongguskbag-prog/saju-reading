import { describe, expect, it } from "vitest";
import { newyearSeason } from "@/lib/season";

describe("신년 시즌", () => {
  it("11월 15일~2월 말(한국 시간)에만 켜지고, 11~12월은 다음 해를 보여 준다", () => {
    expect(newyearSeason(new Date("2026-10-20T03:00:00Z"), undefined)).toBeNull();
    expect(newyearSeason(new Date("2026-11-14T03:00:00Z"), undefined)).toBeNull();
    expect(newyearSeason(new Date("2026-11-15T03:00:00Z"), undefined)).toEqual({ year: 2027, ganzhi: "丁未", reading: "정미", animal: "양", color: "붉은" });
    expect(newyearSeason(new Date("2027-02-10T03:00:00Z"), undefined)?.year).toBe(2027);
    expect(newyearSeason(new Date("2027-03-01T03:00:00Z"), undefined)).toBeNull();
  });

  it("설정으로 켜고 끌 수 있다", () => {
    expect(newyearSeason(new Date("2026-10-20T03:00:00Z"), "on")?.year).toBe(2027);
    expect(newyearSeason(new Date("2026-12-20T03:00:00Z"), "off")).toBeNull();
  });
});
