"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/saju/locale";

/** 앱 화면의 언어별 주소. 앱(APK)은 한국어 주소(/app)로 시작한다. */
const APP_PATHS: Record<Locale, string> = { ko: "/app", "zh-Hant": "/app/zh", "zh-Hans": "/app/zh-hans" };
const OPTIONS: { locale: Locale; label: string; sub: string }[] = [
  { locale: "ko", label: "한국어", sub: "한국" },
  { locale: "zh-Hant", label: "繁體中文", sub: "台灣・香港" },
  { locale: "zh-Hans", label: "简体中文", sub: "中国大陆" },
];
const STORAGE_KEY = "saju-app-locale";

function saved(): Locale | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "ko" || v === "zh-Hant" || v === "zh-Hans" ? v : null;
  } catch {
    return null; // 저장소를 못 쓰는 환경(비공개 창 등)
  }
}

/** 휴대폰 언어에 맞는 앱 언어. 중국어가 아니면 null. */
function deviceLocale(): Locale | null {
  const lang = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
  if (!lang.startsWith("zh")) return null;
  return /hant|tw|hk|mo/.test(lang) ? "zh-Hant" : "zh-Hans";
}

function go(locale: Locale) {
  // 뒤로 가기에 이전 언어 화면이 쌓이지 않게 바꿔 끼운다.
  window.location.replace(APP_PATHS[locale] + window.location.search);
}

/**
 * 앱 화면 맨 위의 언어 고르기. 고른 언어는 기기에 기억해 다음에 앱을 켤 때 그 화면으로 바로 연다.
 * 처음 켤 때는 휴대폰 언어를 따른다(한국어 주소로 들어왔을 때만).
 */
export default function AppLanguage({ current }: { current: Locale }) {
  useEffect(() => {
    const choice = saved();
    if (choice && choice !== current) return go(choice);
    if (!choice && current === "ko") {
      const device = deviceLocale();
      if (device) go(device);
    }
  }, [current]);

  return (
    <nav className="app-lang no-print" aria-label="Language / 언어 / 語言">
      {OPTIONS.map((o) => (
        <button
          key={o.locale}
          type="button"
          lang={o.locale}
          aria-pressed={o.locale === current}
          onClick={() => {
            try {
              window.localStorage.setItem(STORAGE_KEY, o.locale);
            } catch {
              // 기억하지 못해도 이번 이동은 한다.
            }
            if (o.locale !== current) go(o.locale);
          }}
        >
          <b>{o.label}</b>
          <small>{o.sub}</small>
        </button>
      ))}
    </nav>
  );
}
