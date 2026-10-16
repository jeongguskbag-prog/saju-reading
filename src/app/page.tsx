import Landing from "@/components/Landing";
import SajuApp from "@/components/SajuApp";
import { checkoutConfig } from "@/lib/orders";
import { isAiEnabled, isFreeReading } from "@/lib/reading";
import { languageAlternates } from "@/lib/site-copy";
import type { Metadata } from "next";

// 대만(/zh-tw)·홍콩(/zh-hk) 화면이 있다는 것을 검색엔진에 알린다.
export const metadata: Metadata = { alternates: { canonical: "/", languages: languageAlternates() } };

// 환경변수(결제·AI 키) 유무를 요청 시점에 읽는다.
export const dynamic = "force-dynamic";

export default function Home() {
  const { enabled, testMode, mobilePhone, sms, kakao } = checkoutConfig();
  // FREE_READING=1이면 예전처럼 바로 무료 풀이, 아니면 등급까지 무료 + 리포트 구매.
  const free = isFreeReading() && isAiEnabled();
  return (
    <Landing
      checkoutOpen={enabled}
      form={<SajuApp aiEnabled={free} checkout={free ? undefined : { enabled, testMode, mobilePhone, sms, kakao }} />}
    />
  );
}
