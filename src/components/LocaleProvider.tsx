"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { messages, type Messages } from "@/lib/messages";
import type { Locale } from "@/lib/saju/locale";

const LocaleContext = createContext<Locale>("ko");

/** 화면 언어. 감싸지 않으면 한국어. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    // 루트 레이아웃은 lang="ko"라서, 번체 화면에서는 글꼴·낭독기가 중국어로 읽도록 바꾼다.
    const prev = document.documentElement.lang;
    document.documentElement.lang = messages(locale).htmlLang;
    return () => {
      document.documentElement.lang = prev;
    };
  }, [locale]);
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export const useLocale = () => useContext(LocaleContext);
export const useT = (): Messages => messages(useContext(LocaleContext));
