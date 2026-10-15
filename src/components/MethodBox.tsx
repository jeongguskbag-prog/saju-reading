import type { SajuChart } from "@/lib/saju/calc";

/** 감정서 마지막의 작성 방식과 면책 고지. 실제 계산 조건과 AI 풀이 포함 여부에 맞춰 문장을 바꾼다. */
export default function MethodBox({ chart, hasReading }: { chart: SajuChart; hasReading: boolean }) {
  const corrected = chart.input.options?.solarTimeCorrection !== false;
  const timeKnown = chart.pillars.hour !== null;
  const basis = timeKnown
    ? corrected
      ? "절기 시각과 진태양시를 반영한"
      : "절기 시각을 반영한"
    : "절기 시각을 반영한(태어난 시각 미상으로 시주 제외)";
  return (
    <section className="card method print-only">
      <h2>감정서 작성 방식 및 고지</h2>
      <ol>
        <li>
          <b>명식 산출:</b> {basis} 정밀 만세력 엔진이 사주팔자·오행·십신·대운·격국과 참고 용신, 월별 흐름을 계산했습니다.
        </li>
        {hasReading && (
          <li>
            <b>풀이 작성:</b> 방대한 지식을 학습한 최신 유료 AI 모델(Anthropic Claude)이 위 명식을 근거로 작성했습니다.
          </li>
        )}
        <li>
          <b>면책 고지:</b> 이 감정서는 명리학 이론에 기반한 참고 자료이며 미래를 보장하지 않습니다. 의료·법률·재무 등 전문 판단을 대신하지 않고,
          감정서를 참고한 선택과 그 결과에 대한 책임은 의뢰인에게 있습니다.
        </li>
        <li>
          <b>이용 범위:</b> 이 감정서는 {chart.input.name?.trim() || "의뢰인"}님 개인 열람용이며, 무단 복제·배포·판매를 금합니다.
        </li>
      </ol>
    </section>
  );
}
