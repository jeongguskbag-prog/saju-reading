"use client";

import type { SajuChart } from "@/lib/saju/calc";
import { gradeTiers } from "@/lib/saju/grade";
import { ELEMENT_KO } from "@/lib/saju/constants";
import ShareTypeCard, { thisYearLine } from "./ShareTypeCard";

/** 감정서 첫머리 '한눈에 보는 내 사주': 유형·키워드·희소도·올해 흐름, 그리고 SNS용 이미지 저장·공유. 이름은 이미지에 넣지 않는다. */
export default function ReportSummaryCard({ chart, keywords = [] }: { chart: SajuChart; keywords?: string[] }) {
  const g = chart.grade;
  const tier = gradeTiers("ko").find((x) => x.level === g.tier.level) ?? g.tier;
  const kws = keywords.map((k) => k.trim()).filter(Boolean).slice(0, 3);
  const year = thisYearLine(chart);
  const oneIn = g.rarity.oneIn >= 1000 ? Math.round(g.rarity.oneIn / 100) * 100 : g.rarity.oneIn;
  const facts: [string, string][] = [
    ["일간", `${chart.dayMaster.stem}(${chart.dayMaster.ko}${ELEMENT_KO[chart.dayMaster.element]})`],
    ["용신", ELEMENT_KO[chart.analysis.usefulness.yongsin]],
    ["희소도", `${oneIn.toLocaleString("ko-KR")}명 중 1명`],
    ...(year ? ([["올해 흐름", year]] as [string, string][]) : []),
  ];
  return (
    <section className="card report-summary no-print" aria-labelledby="report-summary-h">
      <p className="eyebrow">한눈에 보는 내 사주</p>
      <div className="report-summary-head">
        <span className="report-summary-seal" aria-hidden>
          {[...tier.seal].map((c) => (
            <span key={c}>{c}</span>
          ))}
        </span>
        <div>
          <h2 id="report-summary-h">{tier.type.replace(/\(.*\)$/, "")}</h2>
          <p className="muted">{tier.name}</p>
        </div>
      </div>
      {kws.length > 0 && (
        <ul className="report-summary-kw">
          {kws.map((k) => (
            <li key={k}>#{k}</li>
          ))}
        </ul>
      )}
      <dl className="report-summary-facts">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="muted small">인스타그램 스토리·카카오톡에 올리기 좋은 세로 이미지로 저장할 수 있습니다. 이미지에는 이름이 들어가지 않습니다.</p>
      <ShareTypeCard chart={chart} extra={{ keywords: kws, withYear: true }} embedded />
    </section>
  );
}
