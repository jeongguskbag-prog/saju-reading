"use client";

import { useEffect, useState } from "react";
import SajuApp from "./SajuApp";
import { LocaleProvider } from "./LocaleProvider";
import AppLanguage from "./AppLanguage";
import type { Locale, Region } from "@/lib/saju/locale";

/**
 * Android 앱 전용 화면의 입력·결과. 결제 상자 없이, 앱이 접근 키를 줄 때만 AI 풀이를 켠다.
 * 일반 브라우저로 /app을 열면 키가 없어 명식·등급 계산까지만 보인다.
 */
export default function AppEntry({ serverAi, locale = "ko", regions }: { serverAi: boolean; locale?: Locale; regions?: Region[] }) {
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => {
    setHasKey(Boolean(window.AndroidBridge?.appKey?.()));
  }, []);
  return (
    <LocaleProvider locale={locale}>
      <AppLanguage current={locale} />
      {/* 한국어 앱은 웹처럼 감정서(핵심 명식록·종합 감정서)를 고른다. 결제는 없다. */}
      <SajuApp aiEnabled={serverAi && hasKey} regions={regions} productChoice={locale === "ko"} />
    </LocaleProvider>
  );
}
