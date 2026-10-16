import { describe, expect, it } from "vitest";
import { getMessages, localeFromPath, languageAlternates } from "@/lib/i18n";
import { calculateSaju } from "@/lib/saju/calc";

const HANGUL = /[가-힣]/;

/** 사전의 모든 문자열 값(함수 제외)을 모은다. 키는 한국어 십신 이름일 수 있어 보지 않는다. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe("화면 언어", () => {
  it("주소로 언어를 고른다", () => {
    expect(localeFromPath("/")).toBe("ko");
    expect(localeFromPath("/zh-tw")).toBe("zh-TW");
    expect(localeFromPath("/zh-hk/")).toBe("zh-HK");
    expect(localeFromPath("/zh-twx")).toBe("ko");
    expect(languageAlternates()).toMatchObject({ "ko-KR": "/", "zh-TW": "/zh-tw", "zh-HK": "/zh-hk", "x-default": "/" });
  });

  for (const locale of ["zh-TW", "zh-HK"] as const) {
    it(`${locale} 사전에 한국어 문장이 섞이지 않는다`, () => {
      const t = getMessages(locale);
      const leaked = strings(t).filter((s) => HANGUL.test(s));
      expect(leaked).toEqual([]);
      // 계산 결과로 만드는 문장도 확인
      const chart = calculateSaju({ gender: "female", calendar: "lunar", year: 1979, month: 7, day: 8, hour: 13, minute: 10, options: { region: "TW" } });
      const dynamic = [
        t.chart.timeNote!(chart.time!),
        ...chart.notices.map(t.chart.notice!),
        t.chart.lunarDate!(chart.lunar),
        t.chart.method!(chart.analysis.usefulness.basis),
        t.chart.gyeokguk(chart.analysis.gyeokguk.god),
        t.chart.gyeokgukBasis!(chart.analysis.gyeokguk.monthBranch, chart.analysis.gyeokguk.stem, chart.analysis.gyeokguk.revealed),
        t.chart.strength[chart.strength.label],
        t.errors.input!("leapMonth", { year: 2024, month: 3 }),
      ];
      expect(dynamic.filter((s) => !s || HANGUL.test(s))).toEqual([]);
    });
  }

  it("홍콩판은 홍콩식 단어를 쓴다", () => {
    const hk = getMessages("zh-HK");
    expect(hk.form.solar).toBe("西曆");
    expect(hk.actions.hint).toContain("打印");
    expect(hk.support.mail("a@b.c")).toContain("電郵");
    expect(getMessages("zh-TW").form.solar).toBe("國曆");
  });
});
