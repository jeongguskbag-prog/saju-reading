import type { Metadata } from "next";
import AppEntry from "@/components/AppEntry";
import AppShell from "@/components/AppShell";
import { isAiEnabled } from "@/lib/reading";

// 환경변수(ANTHROPIC_API_KEY·APP_ACCESS_KEY) 유무를 요청 시점에 읽는다.
export const dynamic = "force-dynamic";

// 앱 안에서만 쓰는 화면이라 검색에 노출하지 않는다.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Android 앱이 띄우는 화면. 랜딩·가격·결제 없이 바로 사주를 넣고 감정서를 받는다. */
export default function AppPage() {
  const serverAi = isAiEnabled() && (process.env.APP_ACCESS_KEY ?? "").length >= 16;
  return (
    <AppShell>
      <AppEntry serverAi={serverAi} />
    </AppShell>
  );
}
