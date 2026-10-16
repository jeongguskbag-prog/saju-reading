import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju/calc";
import { computeNaming, fourGrids, lookup, readingsOf, soundElement, suri, SURNAMES } from "@/lib/naming/engine";

const baby = calculateSaju({ gender: "male", calendar: "solar", year: 2026, month: 3, day: 14, hour: 9, minute: 30 }, new Date("2026-10-16T00:00:00Z"));

describe("작명 엔진", () => {
  it("원획 획수와 인명용 음을 쓴다", () => {
    expect(lookup("浩")?.strokes).toBe(11); // 水(4)+告(7)
    expect(lookup("賢")?.strokes).toBe(15);
    expect(lookup("勳")?.strokes).toBe(16);
    expect(lookup("瑞")?.strokes).toBe(14); // 玉(5)+9
    expect(lookup("五")?.strokes).toBe(5); // 숫자는 값으로
    expect(readingsOf("蓮")).toContain("연"); // 두음법칙
    expect(lookup("龘")).toBeNull(); // 인명용 아님
  });

  it("81수리와 4격", () => {
    expect(suri(1).lucky).toBe(true);
    expect(suri(4).lucky).toBe(false);
    expect(suri(83).number).toBe(83);
    expect(suri(83).lucky).toBe(suri(3).lucky);
    const g = fourGrids(8, 11, 15); // 金浩賢
    expect(g.map((x) => x.number)).toEqual([26, 19, 23, 34]);
  });

  it("발음오행(운해본)", () => {
    expect(soundElement("김")).toBe("wood");
    expect(soundElement("나")).toBe("fire");
    expect(soundElement("이")).toBe("earth");
    expect(soundElement("서")).toBe("metal");
    expect(soundElement("민")).toBe("water");
  });

  it("성씨 한자는 모두 획수가 있다", () => {
    for (const s of SURNAMES) for (const h of s.hanja) for (const c of h) expect(lookup(c), `${s.hangul} ${c}`).not.toBeNull();
  });

  it("후보 5개: 네 격 모두 길수, 기신 글자 없음, 같은 한자 반복 없음", () => {
    const r = computeNaming(baby, { mode: "baby", surname: "김", surnameHanja: "金", feelings: ["지혜", "밝음"] });
    expect(r.candidates).toHaveLength(5);
    for (const c of r.candidates) {
      expect(c.grids.every((g) => g.lucky)).toBe(true);
      expect(c.fit.some((f) => f.role === "gisin")).toBe(false);
    }
    const chars = r.candidates.flatMap((c) => c.chars.map((x) => x.char));
    expect(new Set(chars).size).toBe(chars.length);
    expect(r.hangulNames.length).toBeGreaterThan(0);
    // 같은 입력이면 같은 결과
    expect(computeNaming(baby, { mode: "baby", surname: "김", surnameHanja: "金", feelings: ["지혜", "밝음"] }).candidates.map((c) => c.hangul)).toEqual(
      r.candidates.map((c) => c.hangul),
    );
  });

  it("돌림자를 지정한 자리에 넣는다", () => {
    const r = computeNaming(baby, {
      mode: "baby",
      surname: "박",
      surnameHanja: "朴",
      feelings: [],
      generation: { hanja: "俊", reading: "준", position: "second" },
    });
    for (const c of r.candidates) expect(c.chars[1].char).toBe("俊");
  });

  it("개명: 지금 이름도 풀이한다", () => {
    const r = computeNaming(baby, {
      mode: "rename",
      surname: "남궁",
      surnameHanja: "南宮",
      feelings: ["품격"],
      currentName: { hangul: "민수", hanja: "珉秀" },
    });
    expect(r.current?.grids).toHaveLength(4);
    expect(r.candidates.some((c) => c.hangul === "민수")).toBe(false);
  });
});

describe("작명 엔진: 후보가 모자랄 때", () => {
  it("돌림자 개명(남궁 + 俊 첫째 자리)도 다섯 개를 채운다", () => {
    const chart = calculateSaju({ gender: "male", calendar: "solar", year: 1990, month: 5, day: 3, hour: 14, minute: 0 }, new Date("2026-10-16T00:00:00Z"));
    const r = computeNaming(chart, {
      mode: "rename",
      surname: "남궁",
      surnameHanja: "南宮",
      feelings: ["품격"],
      generation: { hanja: "俊", reading: "준", position: "first" },
      currentName: { hangul: "민수", hanja: "珉秀" },
    });
    expect(r.candidates).toHaveLength(5);
    for (const c of r.candidates) {
      expect(c.chars[0].char).toBe("俊");
      expect(c.grids.filter((g) => g.lucky).length).toBeGreaterThanOrEqual(3);
    }
  });
});
