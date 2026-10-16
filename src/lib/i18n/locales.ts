// 사이트 언어(나라)별 설정. 한국어는 루트(/), 대만은 /zh-tw, 홍콩은 /zh-hk.
import type { BirthRegion } from "../saju/calc";

export type Locale = "ko" | "zh-TW" | "zh-HK";

export interface LocaleConfig {
  locale: Locale;
  /** 주소 앞부분. 한국어는 "" */
  path: "" | "/zh-tw" | "/zh-hk";
  /** <html lang> */
  htmlLang: string;
  /** hreflang */
  hreflang: string;
  /** 공유 미리보기(og:locale) */
  ogLocale: string;
  /** 출생지 기본값(시간대·진태양시 경도) */
  region: BirthRegion;
  /** 언어 전환 링크에 쓰는 이름 */
  label: string;
  /** 이 언어로 감정서를 팔지. 해외 결제가 붙기 전까지 대만·홍콩은 false */
  sales: boolean;
}

export const LOCALES: Record<Locale, LocaleConfig> = {
  ko: { locale: "ko", path: "", htmlLang: "ko", hreflang: "ko-KR", ogLocale: "ko_KR", region: "KR", label: "한국어", sales: true },
  "zh-TW": {
    locale: "zh-TW",
    path: "/zh-tw",
    htmlLang: "zh-Hant-TW",
    hreflang: "zh-TW",
    ogLocale: "zh_TW",
    region: "TW",
    label: "繁體中文（台灣）",
    sales: false,
  },
  "zh-HK": {
    locale: "zh-HK",
    path: "/zh-hk",
    htmlLang: "zh-Hant-HK",
    hreflang: "zh-HK",
    ogLocale: "zh_HK",
    region: "HK",
    label: "繁體中文（香港）",
    sales: false,
  },
};

export const LOCALE_ORDER: Locale[] = ["ko", "zh-TW", "zh-HK"];

/** 주소(pathname)로 언어를 고른다. */
export function localeFromPath(pathname: string): Locale {
  if (pathname === "/zh-tw" || pathname.startsWith("/zh-tw/")) return "zh-TW";
  if (pathname === "/zh-hk" || pathname.startsWith("/zh-hk/")) return "zh-HK";
  return "ko";
}

/** 검색엔진에 알려 줄 언어별 주소(hreflang). */
export function languageAlternates(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALE_ORDER) out[LOCALES[l].hreflang] = LOCALES[l].path || "/";
  out["x-default"] = "/";
  return out;
}
