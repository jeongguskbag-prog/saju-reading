"use client";
// 추가 상품 감정서 화면. 상품마다 계산 화면이 다르고, AI 문장(장·조언)은 같은 모양으로 보여 준다.
import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import type { ExtraKind, ExtraResult, SectionsText } from "@/lib/extras/kinds";
import { Pending, cssString, watermark, type PartStates } from "../ReportView";
import { useT } from "../LocaleProvider";
import GunghapReport from "./GunghapReport";
import NewyearReport from "./NewyearReport";
import TaekilReport from "./TaekilReport";

const NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

/** AI가 쓴 장들과 조언 */
export function SectionsBody({ text, adviceTitle = "함께 실천할 일" }: { text: SectionsText; adviceTitle?: string }) {
  return (
    <>
      {text.sections.map((s, i) => (
        <section key={s.heading} className="part extra-part">
          <header className="part-head">
            <span>{NUM[i] ?? i + 1}</span>
            <h2>{s.heading}</h2>
          </header>
          <section className="card extra-text">
            {s.paragraphs.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </section>
        </section>
      ))}
      {text.advice.length > 0 && (
        <section className="part extra-part">
          <header className="part-head">
            <span>結</span>
            <h2>{adviceTitle}</h2>
          </header>
          <section className="card">
            <ol className="extra-advice">
              {text.advice.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ol>
          </section>
        </section>
      )}
    </>
  );
}

export function ExtraFooter({ chart }: { chart: SajuChart }) {
  const t = useT();
  return (
    <>
      <div className="print-footer print-only">{watermark(chart, t)}</div>
      <style>{`@media print {
  @page { @bottom-center { content: ${cssString(watermark(chart, t))}; font-size: 8.5pt; color: #9a978d; }
          @bottom-right { content: counter(page); font-size: 8.5pt; color: #9a978d; } }
  @page :first { @bottom-center { content: none; } @bottom-right { content: none; } }
}`}</style>
    </>
  );
}

export default function ExtraReport({
  kind,
  chart,
  parts,
  onRetry,
  notice,
  title,
}: {
  kind: ExtraKind;
  chart: SajuChart;
  parts: PartStates;
  onRetry: () => void;
  notice?: ReactNode;
  title: string;
}) {
  const state = parts[kind];
  const data: ExtraResult | null = state?.status === "done" && "extra" in state.result ? state.result.extra : null;
  const pending = <Pending state={state} onRetry={onRetry} label={title} />;
  if (kind === "taekil") return <TaekilReport chart={chart} data={data as never} pending={pending} notice={notice} title={title} />;
  if (kind === "newyear") return <NewyearReport chart={chart} data={data as never} pending={pending} notice={notice} title={title} />;
  if (kind === "gunghap") return <GunghapReport chart={chart} data={data as never} pending={pending} notice={notice} title={title} />;
  return (
    <div className="report extra">
      {notice}
      {data ? <SectionsBody text={data.text as SectionsText} /> : pending}
      <ExtraFooter chart={chart} />
    </div>
  );
}
