// Android 앱(WebView)용 진입점. 명식은 기기 안에서 계산하고,
// AI 풀이는 빌드 시 지정한 서버(SAJU_API_BASE)의 /api/reading을 호출한다.
import { createRoot } from "react-dom/client";
import AppShell from "@/components/AppShell";
import SajuApp, { postJson } from "@/components/SajuApp";
import { calculateSaju, type BirthInput } from "@/lib/saju/calc";
import type { Reading } from "@/lib/reading-shared";

declare const SAJU_API_BASE: string;

const apiBase = SAJU_API_BASE.replace(/\/$/, "");

async function computeChart(input: BirthInput) {
  // 서버와 같은 계산 함수. 입력 오류(InputError)는 메시지 그대로 화면에 표시된다.
  return calculateSaju(input);
}

async function requestReading(input: BirthInput) {
  const { reading } = await postJson<{ reading: Reading }>(`${apiBase}/api/reading`, input);
  return reading;
}

createRoot(document.getElementById("root")!).render(
  <AppShell>
    <SajuApp aiEnabled={apiBase !== ""} computeChart={computeChart} requestReading={requestReading} />
  </AppShell>,
);
