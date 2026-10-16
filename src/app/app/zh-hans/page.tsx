import type { Metadata } from "next";
import AppEntry from "@/components/AppEntry";
import AppShell from "@/components/AppShell";
import { isAiEnabled } from "@/lib/reading";

// 환경변수(ANTHROPIC_API_KEY·APP_ACCESS_KEY) 유무를 요청 시점에 읽는다.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "天机录 — 精密八字命书",
  robots: { index: false, follow: false },
};

/**
 * 중국 대륙용 Android 앱(간체)이 띄우는 화면. 결제 없이 바로 명식과 간체 감정서를 받는다.
 * 중국 대륙에서는 Google Fonts가 막혀 있어 웹 글꼴을 불러오지 않고 기기의 간체 글꼴을 쓴다.
 */
export default function AppZhHansPage() {
  const serverAi = isAiEnabled() && (process.env.APP_ACCESS_KEY ?? "").length >= 16;
  return (
    <AppShell locale="zh-Hans">
      <AppEntry serverAi={serverAi} locale="zh-Hans" regions={["CN"]} />
    </AppShell>
  );
}
