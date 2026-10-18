"use client";

import { useEffect, useState } from "react";
import SajuApp from "./SajuApp";
import { LocaleProvider } from "./LocaleProvider";
import AppLanguage from "./AppLanguage";
import type { Locale, Region } from "@/lib/saju/locale";

/** 앱 밖(PC·휴대폰 브라우저)에서 /app을 열면 보낼 홈페이지(화면 언어별) */
const HOME: Record<Locale, string> = { ko: "/", "zh-Hant": "/zh-tw", "zh-Hans": "/zh-tw", en: "/en" };

/**
 * Android 앱 전용 화면의 입력·결과. 결제 상자 없이, 앱이 접근 키를 줄 때만 AI 풀이를 켠다.
 * 앱(AndroidBridge)이 아닌 일반 브라우저로 /app을 열면 아무것도 보여 주지 않고 바로 홈페이지로 보낸다.
 */
export default function AppEntry({ serverAi, locale = "ko", regions }: { serverAi: boolean; locale?: Locale; regions?: Region[] }) {
  // null: 아직 확인 전(앱 여부는 브라우저에서만 알 수 있다)
  const [inApp, setInApp] = useState<boolean | null>(null);
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => {
    // 앱이 아니면 안내 없이 바로 홈페이지로 보낸다(뒤로 가기로 이 화면에 다시 오지 않게 replace).
    if (!window.AndroidBridge) {
      window.location.replace(HOME[locale] ?? "/");
      return;
    }
    setInApp(true);
    setHasKey(Boolean(window.AndroidBridge?.appKey?.()));
  }, [locale]);
  // 확인 전이거나 앱이 아니면(홈페이지로 넘어가는 중) 아무것도 그리지 않는다.
  if (!inApp) return null;
  return (
    <LocaleProvider locale={locale}>
      <AppLanguage current={locale} />
      {/* 웹처럼 감정서(핵심 명식록·종합 감정서)를 고른다. 결제는 없다. 작명록은 한국어 웹에서만 신청한다. */}
      <SajuApp aiEnabled={serverAi && hasKey} regions={regions} productChoice />
    </LocaleProvider>
  );
}
