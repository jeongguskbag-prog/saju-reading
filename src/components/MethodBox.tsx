import type { SajuChart } from "@/lib/saju/calc";
import { getMessages, type Locale } from "@/lib/i18n";

/** 감정서 마지막의 작성 방식과 면책 고지. 실제 계산 조건과 AI 풀이 포함 여부에 맞춰 문장을 바꾼다. */
export default function MethodBox({ chart, hasReading, locale }: { chart: SajuChart; hasReading: boolean; locale?: Locale }) {
  const t = getMessages(locale);
  const m = t.methodBox;
  const corrected = chart.input.options?.solarTimeCorrection !== false;
  const timeKnown = chart.pillars.hour !== null;
  return (
    <section className="card method print-only">
      <h2>{m.title}</h2>
      <ol>
        <li>
          <b>{m.calcLabel}</b>
          {m.calc(m.basis(timeKnown, corrected))}
        </li>
        {hasReading && (
          <li>
            <b>{m.aiLabel}</b>
            {m.ai}
          </li>
        )}
        <li>
          <b>{m.disclaimerLabel}</b>
          {m.disclaimer}
        </li>
        <li>
          <b>{m.useLabel}</b>
          {m.use(chart.input.name?.trim() || t.client)}
        </li>
      </ol>
    </section>
  );
}
