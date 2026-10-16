import { describe, expect, it } from "vitest";
import { calculateSaju, InputError, type BirthInput } from "@/lib/saju/calc";
import { gyeokgukLabel, tzOffsetMinutes } from "@/lib/saju/locale";

const base = (over: Partial<BirthInput>): BirthInput => ({
  gender: "female",
  calendar: "solar",
  year: 1990,
  month: 7,
  day: 1,
  hour: 13,
  minute: 30,
  region: "TW",
  locale: "zh-Hant",
  ...over,
});

const HANGUL = /[가-힣]/;

describe("대만·홍콩 시간대", () => {
  it("시간대 데이터의 과거 서머타임을 반영한다", () => {
    expect(tzOffsetMinutes("Asia/Taipei", 2000, 1, 1, 12, 0)).toBe(480);
    expect(tzOffsetMinutes("Asia/Taipei", 1975, 7, 1, 12, 0)).toBe(540); // 1975 대만 일광절약시간
    expect(tzOffsetMinutes("Asia/Hong_Kong", 1970, 7, 1, 12, 0)).toBe(540); // 1970 홍콩 여름시간
    expect(tzOffsetMinutes("Asia/Hong_Kong", 1990, 7, 1, 12, 0)).toBe(480);
  });

  it("서머타임 기간의 13:30은 표준시 12:30(午時)으로 계산한다", () => {
    const off = { solarTimeCorrection: false };
    const tw = calculateSaju(base({ year: 1975, options: off }));
    expect(tw.pillars.hour?.branch).toBe("午");
    expect(tw.warnings.some((w) => w.includes("夏令時間"))).toBe(true);
    const hk = calculateSaju(base({ year: 1970, region: "HK", options: off }));
    expect(hk.pillars.hour?.branch).toBe("午");
    // 서머타임이 없던 해는 그대로 未時.
    expect(calculateSaju(base({ year: 1990, options: off })).pillars.hour?.branch).toBe("未");
  });

  it("진태양시 보정은 지역 대표 경도를 쓴다", () => {
    // 타이베이 121.56° → 표준시보다 약 6분 빠르다. 13:30 → 13:36
    expect(calculateSaju(base({})).timeNote).toContain("13:36");
    // 홍콩 114.17° → 약 23분 늦다. 13:30 → 13:06
    expect(calculateSaju(base({ region: "HK" })).timeNote).toContain("13:06");
  });

  it("한국(기본값) 결과는 그대로다", () => {
    const ko = calculateSaju(base({ region: undefined, locale: undefined, year: 1988, month: 6, day: 1, hour: 10, minute: 0 }));
    expect(ko.locale).toBe("ko");
    expect(ko.warnings).toContain("1987~1988년 서머타임(1시간)을 반영했습니다.");
  });
});

describe("번체 문장", () => {
  it("명식 문장에 한글이 섞이지 않는다", () => {
    for (const over of [{}, { hour: null, minute: null }, { calendar: "lunar" as const, month: 5, day: 10 }, { year: 1975 }]) {
      const c = calculateSaju(base(over));
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
        c.grade.rarity.label,
        ...c.warnings,
      ];
      for (const t of texts) expect(t, t).not.toMatch(HANGUL);
    }
  });

  it("격국 내부 키는 한국어로 남아 등급 통계와 맞는다", () => {
    const c = calculateSaju(base({}));
    expect(c.analysis.gyeokguk.name).toMatch(/격$/);
    expect(c.analysis.gyeokguk.label).toMatch(/格$/);
    expect(c.grade.rarity.key).toContain(c.analysis.gyeokguk.name);
  });

  it("격국 이름 변환", () => {
    expect(gyeokgukLabel("편관격", "zh-Hant")).toBe("七殺格");
    expect(gyeokgukLabel("건록격", "zh-Hant")).toBe("建祿格");
    expect(gyeokgukLabel("정재격", "ko")).toBe("정재격");
  });

  it("입력 오류도 번체로 알린다", () => {
    expect(() => calculateSaju(base({ month: 2, day: 30 }))).toThrow(new InputError("這個國曆日期不存在。"));
    expect(() => calculateSaju(base({ year: 2030 }), new Date("2026-10-15T00:00:00Z"))).toThrow("出生日期晚於今天");
  });
});

describe("번체 AI 입력 데이터", () => {
  it("이름을 보내지 않고, 키·값에 한글이 없다", async () => {
    const { chartForPromptZh } = await import("@/lib/reading");
    const chart = calculateSaju(base({ name: "王小明", year: 2000, month: 1, day: 1, hour: 12, minute: 0, options: { solarTimeCorrection: false } }), new Date("2026-10-14T00:00:00Z"));
    const data = chartForPromptZh(chart);
    const json = JSON.stringify(data);
    expect(json).not.toContain("王小明");
    expect(json).not.toMatch(HANGUL);
    expect(data.命局.日柱?.干支).toBe("戊午");
    expect(data.命局.年柱?.天干.十神).toBe("劫財");
    expect(data.格局).toContain("正財格");
    expect(data.流月).toHaveLength(24);
  });

  it("번체 장 제목은 한국어판과 소제목 수가 같다", async () => {
    const { CHAPTERS, CHAPTERS_ZH, CHAPTER_KEYS } = await import("@/lib/report-shared");
    for (const k of CHAPTER_KEYS) {
      expect(CHAPTERS_ZH[k].sections).toHaveLength(CHAPTERS[k].sections.length);
      expect(JSON.stringify(CHAPTERS_ZH[k])).not.toMatch(HANGUL);
    }
  });

  it("무료 풀이 한도 안내도 번체로", async () => {
    const { takeFreeQuota } = await import("@/lib/rate-limit");
    process.env.FREE_LIMIT_PER_HOUR = "1";
    try {
      let last;
      for (let i = 0; i < 13; i++) last = await takeFreeQuota("10.9.9.9", new Date("2026-10-15T00:00:00Z"), "zh-Hant");
      expect(last).toEqual({ ok: false, message: "免費解讀每小時最多可使用 1 次，請稍後再試。" });
    } finally {
      delete process.env.FREE_LIMIT_PER_HOUR;
    }
  });
});

describe("번체 화면 사전", () => {
  it("모든 문구에 한글이 없다", async () => {
    const { messages } = await import("@/lib/messages");
    const zh = messages("zh-Hant");
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
        // 인자 자리에 숫자·한자를 넣어 본다(한국어 키를 받는 함수는 번체로 바꿔 돌려줘야 한다).
        const out = (v as (...a: unknown[]) => unknown)(...(k === "god" ? ["편관"] : k === "mark" ? ["주의"] : k === "noble" ? ["천을귀인"] : k === "el" || k === "elShort" ? ["wood"] : k === "regionName" || k === "solarCorrection" ? ["TW"] : k === "glyphSub" ? ["갑", "wood"] : k === "elementMissing" ? [["木"]] : [1, 2, 3, 4]));
        if (typeof out === "string") samples.push(out);
      }
    }
    for (const s of samples) expect(s, s).not.toMatch(HANGUL);
  });
});
