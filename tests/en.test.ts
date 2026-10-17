import { describe, expect, it } from "vitest";
import { calculateSaju, InputError, type BirthInput } from "@/lib/saju/calc";
import { gyeokgukLabel } from "@/lib/saju/locale";

const base = (over: Partial<BirthInput>): BirthInput => ({
  gender: "male",
  calendar: "solar",
  year: 1990,
  month: 7,
  day: 1,
  hour: 13,
  minute: 30,
  locale: "en",
  ...over,
});

const HANGUL = /[가-힣]/;

describe("영어 명식", () => {
  it("명식 문장에 한글이 섞이지 않는다", () => {
    for (const over of [{}, { hour: null, minute: null }, { calendar: "lunar" as const, month: 5, day: 10 }, { region: "TW" as const }, { region: "CN" as const }, { year: 1988, month: 6 }]) {
      const c = calculateSaju(base(over));
      expect(c.locale).toBe("en");
      const texts = [
        c.lunarDate,
        c.timeNote ?? "",
        c.zodiac,
        c.strength.label,
        c.analysis.gyeokguk.label,
        c.analysis.gyeokguk.basis,
        c.analysis.usefulness.method,
        ...Object.values(c.analysis.lucky).map(String),
        ...c.analysis.tenGodGuide.map((g) => g.modern),
        c.grade.tier.name,
        c.grade.tier.desc,
        c.grade.tier.type,
        c.grade.rarity.label,
        ...c.warnings,
      ];
      for (const t of texts) expect(t, t).not.toMatch(HANGUL);
    }
  });

  it("격국 내부 키는 한국어로 남는다", () => {
    const c = calculateSaju(base({}));
    expect(c.analysis.gyeokguk.name).toMatch(/격$/);
    expect(c.grade.rarity.key).toContain(c.analysis.gyeokguk.name);
    expect(gyeokgukLabel("정관격", "en")).toBe("Direct Officer structure (正官格)");
  });

  it("입력 오류도 영어로 알린다", () => {
    let err: unknown;
    try {
      calculateSaju(base({ month: 2, day: 30 }));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(InputError);
    expect((err as Error).message).not.toMatch(HANGUL);
  });
});

describe("영어 AI 입력 데이터", () => {
  it("이름을 보내지 않고, 키·값에 한글이 없다", async () => {
    const { chartForPromptEn } = await import("@/lib/reading");
    const chart = calculateSaju(base({ name: "Alex Kim", year: 2000, month: 1, day: 1, hour: 12, minute: 0, options: { solarTimeCorrection: false } }), new Date("2026-10-14T00:00:00Z"));
    const json = JSON.stringify(chartForPromptEn(chart));
    expect(json).not.toContain("Alex Kim");
    expect(json).not.toMatch(HANGUL);
  });

  it("영어 장 제목은 한국어판과 소제목 수가 같다", async () => {
    const { CHAPTERS, CHAPTERS_EN, CHAPTER_KEYS } = await import("@/lib/report-shared");
    for (const k of CHAPTER_KEYS) {
      expect(CHAPTERS_EN[k].sections).toHaveLength(CHAPTERS[k].sections.length);
      expect(JSON.stringify(CHAPTERS_EN[k])).not.toMatch(HANGUL);
    }
  });
});

describe("영어 화면 사전", () => {
  it("모든 문구에 한글이 없고, 한국어 사전과 키가 같다", async () => {
    const { messages } = await import("@/lib/messages");
    const en = messages("en");
    expect(Object.keys(en).sort()).toEqual(Object.keys(messages("ko")).sort());
    const samples: string[] = [];
    const walk = (o: unknown): void => {
      if (typeof o === "string") samples.push(o);
      else if (o && typeof o === "object") Object.values(o).forEach(walk);
    };
    for (const [k, v] of Object.entries(en)) {
      if (typeof v === "function") {
        const args = k === "god" ? ["편관"] : k === "mark" ? ["주의"] : k === "noble" ? ["천을귀인"] : k === "el" || k === "elShort" ? ["wood"] : k === "regionName" || k === "solarCorrection" ? ["CN"] : k === "glyphSub" ? ["갑", "wood"] : k === "elementMissing" || k === "needFields" ? [["Wood"]] : [1, 2, 3, 4];
        const out = (v as (...a: unknown[]) => unknown)(...args);
        if (typeof out === "string") samples.push(out);
      } else walk(v);
    }
    for (const s of samples) expect(s, s).not.toMatch(HANGUL);
  });
});
