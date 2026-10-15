import type { Metadata } from "next";
import AppEntry from "@/components/AppEntry";
import AppShell from "@/components/AppShell";
import { isAiEnabled } from "@/lib/reading";

// 환경변수(ANTHROPIC_API_KEY·APP_ACCESS_KEY) 유무를 요청 시점에 읽는다.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "天機錄 — 精密八字命書",
  robots: { index: false, follow: false },
};

/** 대만·홍콩용 Android 앱(번체)이 띄우는 화면. 결제 없이 바로 명식과 번체 감정서를 받는다. */
export default function AppZhPage() {
  const serverAi = isAiEnabled() && (process.env.APP_ACCESS_KEY ?? "").length >= 16;
  return (
    <>
      {/* 번체 한자 명조·고딕 글꼴. 한국어 화면의 Song Myung에는 번체 글자가 빠져 있다. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&display=swap" />
      <AppShell locale="zh-Hant">
        <AppEntry serverAi={serverAi} locale="zh-Hant" regions={["TW", "HK"]} />
      </AppShell>
    </>
  );
}
