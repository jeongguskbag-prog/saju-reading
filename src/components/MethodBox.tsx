import type { SajuChart } from "@/lib/saju/calc";
import { useT } from "./LocaleProvider";

/** 감정서 마지막의 작성 방식과 면책 고지. 실제 계산 조건과 AI 풀이 포함 여부에 맞춰 문장을 바꾼다. */
export default function MethodBox({ chart, hasReading }: { chart: SajuChart; hasReading: boolean }) {
  const t = useT();
  const corrected = chart.input.options?.solarTimeCorrection !== false;
  const timeKnown = chart.pillars.hour !== null;
  const basis = t.methodBasis(timeKnown, corrected);
  return (
    <section className="card method print-only">
      <h2>{t.methodTitle}</h2>
      <ol>
        <li>
          <b>{t.methodChartLabel}</b> {t.methodChart(basis)}
        </li>
        {hasReading && (
          <li>
            <b>{t.methodReadingLabel}</b> {t.methodReading}
          </li>
        )}
        <li>
          <b>{t.methodDisclaimerLabel}</b> {t.methodDisclaimer}
        </li>
        <li>
          <b>{t.methodUseLabel}</b> {t.methodUse(chart.input.name?.trim() || t.client)}
        </li>
      </ol>
    </section>
  );
}
