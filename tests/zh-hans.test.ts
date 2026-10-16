import { describe, expect, it } from "vitest";
import { calculateSaju, type BirthInput } from "@/lib/saju/calc";
import { gyeokgukLabel, tzOffsetMinutes } from "@/lib/saju/locale";
import { messages } from "@/lib/messages";
import { chartForPromptHans } from "@/lib/reading";
import { CHAPTERS, CHAPTERS_HANS, CHAPTER_KEYS } from "@/lib/report-shared";

const base = (over: Partial<BirthInput>): BirthInput => ({
  gender: "male",
  calendar: "solar",
  year: 1990,
  month: 7,
  day: 1,
  hour: 13,
  minute: 30,
  region: "CN",
  locale: "zh-Hans",
  ...over,
});

const HANGUL = /[가-힣]/;
// 간체 문장에 나오면 안 되는 번체 글자(자주 쓰는 것). 乾(乾命)은 간체에서도 그대로 쓴다.
const TRADITIONAL = /[們個時來為與這說國書運勢門開關體點過還後對應當實專學陽陰歲貴無給級氣強財傷殺歷曆農節據層網檔儲錄機論盤選詳請確輸內換誤閱讀寫顏數習慣興]/;

function textsOf(c: ReturnType<typeof calculateSaju>) {
  return [
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
    c.grade.rarity.label,
    ...c.warnings,
  ];
}

describe("중국 대륙 시간", () => {
  it("1986~1991년 중국 서머타임을 반영한다", () => {
    expect(tzOffsetMinutes("Asia/Shanghai", 1988, 7, 1, 12, 0)).toBe(540);
    expect(tzOffsetMinutes("Asia/Shanghai", 1995, 7, 1, 12, 0)).toBe(480);
    const c = calculateSaju(base({ year: 1988, options: { solarTimeCorrection: false } }));
    expect(c.pillars.hour?.branch).toBe("午"); // 13:30(서머타임) → 표준시 12:30
    expect(c.warnings.some((w) => w.includes("夏令时"))).toBe(true);
  });

  it("진태양시는 출생 도시 경도를 쓴다(기본 베이징)", () => {
    // 1995년(서머타임 없음). 베이징 116.4° → 약 -14분: 13:30 → 13:15
    expect(calculateSaju(base({ year: 1995 })).timeNote).toContain("13:15");
    // 우루무치 87.62° → 약 -2시간 10분: 13:30 → 11:20(午時), 12:00 → 09:50(巳時)
    const urumqi = calculateSaju(base({ year: 1995, options: { longitude: 87.62 } }));
    expect(urumqi.timeNote).toContain("11:20");
    expect(urumqi.pillars.hour?.branch).toBe("午");
    expect(calculateSaju(base({ year: 1995, hour: 12, minute: 0, options: { longitude: 87.62 } })).pillars.hour?.branch).toBe("巳");
    // 1990년은 서머타임이라 1시간을 먼저 뺀다: 13:30 → 12:30 → 12:15
    expect(calculateSaju(base({})).timeNote).toContain("12:15");
  });
});

describe("간체 문장", () => {
  it("명식 문장에 한글·번체가 섞이지 않는다", () => {
    for (const over of [{}, { hour: null, minute: null }, { calendar: "lunar" as const, month: 5, day: 10 }, { year: 1988 }]) {
      for (const t of textsOf(calculateSaju(base(over)))) {
        expect(t, t).not.toMatch(HANGUL);
        expect(t, t).not.toMatch(TRADITIONAL);
      }
    }
  });

  it("격국 이름", () => {
    expect(gyeokgukLabel("편관격", "zh-Hans")).toBe("七杀格");
    expect(gyeokgukLabel("건록격", "zh-Hans")).toBe("建禄格");
    expect(gyeokgukLabel("정재격", "zh-Hans")).toBe("正财格");
  });

  it("AI 입력 데이터: 이름 없음, 한글·번체 없음", () => {
    const chart = calculateSaju(base({ name: "张伟", year: 2000, month: 1, day: 1, hour: 12, minute: 0, options: { solarTimeCorrection: false } }), new Date("2026-10-14T00:00:00Z"));
    const data = chartForPromptHans(chart);
    const json = JSON.stringify(data);
    expect(json).not.toContain("张伟");
    expect(json).not.toMatch(HANGUL);
    expect(json).not.toMatch(TRADITIONAL);
    expect(data.命局.日柱?.干支).toBe("戊午");
    expect(data.命局.年柱?.天干.十神).toBe("劫财");
    expect(data.性别).toBe("男性（乾命）");
  });

  it("장 구성은 한국어판과 소제목 수가 같다", () => {
    for (const k of CHAPTER_KEYS) {
      expect(CHAPTERS_HANS[k].sections).toHaveLength(CHAPTERS[k].sections.length);
      expect(JSON.stringify(CHAPTERS_HANS[k])).not.toMatch(TRADITIONAL);
    }
  });

  it("화면 사전에 한글·번체가 없다", () => {
    const zh = messages("zh-Hans");
    expect(zh.htmlLang).toBe("zh-Hans");
    const samples: string[] = [];
    for (const [k, v] of Object.entries(zh)) {
      if (typeof v === "string") samples.push(v);
      else if (Array.isArray(v)) samples.push(...v);
      else if (v && typeof v === "object") {
        // 상품 이름처럼 한 단계 더 들어간 문구도 모은다.
        const walk = (o: unknown): void => {
          if (typeof o === "string") samples.push(o);
          else if (o && typeof o === "object") Object.values(o).forEach(walk);
        };
        walk(v);
      }
      else if (typeof v === "function") {
        const args =
          k === "god" ? ["편관"] : k === "mark" ? ["주의"] : k === "noble" ? ["천을귀인"] : k === "el" || k === "elShort" ? ["wood"]
          : k === "regionName" || k === "solarCorrection" ? ["CN"] : k === "glyphSub" ? ["갑", "wood"] : k === "elementMissing" ? [["木"]] : [1, 2, 3, 4];
        const out = (v as (...a: unknown[]) => unknown)(...args);
        if (typeof out === "string") samples.push(out);
      }
    }
    for (const s of samples) {
      expect(s, s).not.toMatch(HANGUL);
      expect(s, s).not.toMatch(TRADITIONAL);
    }
  });
});
