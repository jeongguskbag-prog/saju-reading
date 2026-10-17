import type { Metadata } from "next";
import AppEntry from "@/components/AppEntry";
import AppShell from "@/components/AppShell";
import { isAiEnabled } from "@/lib/reading";

// 환경변수(ANTHROPIC_API_KEY·APP_ACCESS_KEY) 유무를 요청 시점에 읽는다.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cheongirok — Four Pillars Reading",
  robots: { index: false, follow: false },
};

/** 영어 앱 화면. 결제 없이 바로 명식과 영어 감정서를 받는다. 출생 지역은 엔진이 아는 네 곳에서 고른다. */
export default function AppEnPage() {
  const serverAi = isAiEnabled() && (process.env.APP_ACCESS_KEY ?? "").length >= 16;
  return (
    <AppShell locale="en">
      <AppEntry serverAi={serverAi} locale="en" regions={["KR", "TW", "HK", "CN"]} />
    </AppShell>
  );
}
