"use client";

import { useEffect, useState } from "react";
import SajuApp from "./SajuApp";
import { LocaleProvider } from "./LocaleProvider";
import AppLanguage from "./AppLanguage";
import type { Locale, Region } from "@/lib/saju/locale";

/** 앱 밖(PC·휴대폰 브라우저)에서 /app을 열었을 때의 안내 */
const ONLY_APP: Record<Locale, { title: string; text: string; home: string; href: string }> = {
  ko: { title: "천기록 앱 전용 화면입니다", text: "이 화면은 천기록 앱 안에서만 열립니다. 홈페이지에서 무료로 사주 유형을 확인하고 감정서를 신청하실 수 있습니다.", home: "천기록 홈페이지로 가기", href: "/" },
  "zh-Hant": { title: "此畫面僅限天機錄 App 使用", text: "此畫面只能在天機錄 App 內開啟。請前往官網查看八字並申請命書。", home: "前往天機錄官網", href: "/zh-tw" },
  "zh-Hans": { title: "此页面仅限天机录 App 使用", text: "此页面只能在天机录 App 内打开。请前往官网查看八字并申请命书。", home: "前往天机录官网", href: "/zh-tw" },
  en: { title: "This page is for the Chungirok app", text: "This page opens only inside the Chungirok app. Visit the website to see your chart and order a reading.", home: "Go to the Chungirok website", href: "/en" },
};

/**
 * Android 앱 전용 화면의 입력·결과. 결제 상자 없이, 앱이 접근 키를 줄 때만 AI 풀이를 켠다.
 * 앱(AndroidBridge)이 아닌 일반 브라우저로 /app을 열면 화면을 보여 주지 않고 홈페이지로 안내한다.
 */
export default function AppEntry({ serverAi, locale = "ko", regions }: { serverAi: boolean; locale?: Locale; regions?: Region[] }) {
  // null: 아직 확인 전(앱 여부는 브라우저에서만 알 수 있다)
  const [inApp, setInApp] = useState<boolean | null>(null);
  const [hasKey, setHasKey] = useState(false);
  useEffect(() => {
    setInApp(Boolean(window.AndroidBridge));
    setHasKey(Boolean(window.AndroidBridge?.appKey?.()));
  }, []);
  if (inApp === null) return null;
  if (!inApp) {
    const m = ONLY_APP[locale] ?? ONLY_APP.ko;
    return (
      <section className="card app-only" role="note">
        <h1>{m.title}</h1>
        <p>{m.text}</p>
        <a className="btn-primary" href={m.href}>
          {m.home}
        </a>
      </section>
    );
  }
  return (
    <LocaleProvider locale={locale}>
      <AppLanguage current={locale} />
      {/* 웹처럼 감정서(핵심 명식록·종합 감정서)를 고른다. 결제는 없다. 작명록은 한국어 웹에서만 신청한다. */}
      <SajuApp aiEnabled={serverAi && hasKey} regions={regions} productChoice />
    </LocaleProvider>
  );
}
