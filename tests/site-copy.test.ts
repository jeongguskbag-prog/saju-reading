import { describe, expect, it } from "vitest";
import { languageAlternates, siteCopy, siteFromPath } from "@/lib/site-copy";

const HANGUL = /[가-힣]/;

/** 문구 사전의 모든 문자열 값과, 함수는 예시 값으로 부른 결과를 모은다. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (typeof v === "function") strings((v as (...a: unknown[]) => unknown)("1960", "2009", "438,312"), out);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}

describe("사이트 언어", () => {
  it("주소로 사이트 언어를 고른다", () => {
    expect(siteFromPath("/")).toBe("ko");
    expect(siteFromPath("/zh-tw")).toBe("zh-TW");
    expect(siteFromPath("/zh-hk/")).toBe("zh-HK");
    expect(siteFromPath("/zh-twx")).toBe("ko");
    expect(languageAlternates()).toMatchObject({ "ko-KR": "/", "zh-TW": "/zh-tw", "zh-HK": "/zh-hk", "x-default": "/" });
  });

  for (const site of ["zh-TW", "zh-HK"] as const) {
    it(`${site} 문구에 한국어가 섞이지 않는다`, () => {
      expect(strings(siteCopy(site)).filter((s) => HANGUL.test(s))).toEqual([]);
    });
  }

  it("홍콩판은 홍콩식 표현을 쓴다", () => {
    const hk = siteCopy("zh-HK");
    expect(hk.support.mail("a@b.c")).toContain("電郵");
    expect(hk.landing.faq.some((f) => f.q.includes("在香港以外出生"))).toBe(true);
    expect(hk.meta.description).toContain("香港時區");
    expect(siteCopy("zh-TW").meta.description).toContain("台灣時區");
  });
});
