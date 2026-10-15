import Landing from "@/components/Landing";
import SajuApp from "@/components/SajuApp";
import { isAiEnabled } from "@/lib/reading";

// 환경변수(ANTHROPIC_API_KEY) 유무를 요청 시점에 읽는다.
export const dynamic = "force-dynamic";

export default function Home() {
  return <Landing form={<SajuApp aiEnabled={isAiEnabled()} />} />;
}
