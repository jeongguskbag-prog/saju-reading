"use client";
import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import { ELEMENT_KO } from "@/lib/saju/constants";
import type { NewyearResult } from "@/lib/extras/newyear";
import type { Relation } from "@/lib/extras/relations";
import { Cover } from "../ReportView";
import { PillarsCard } from "../ChartView";
import { ExtraFooter, SectionsBody } from "./ExtraReport";

const rels = (rs: Relation[]) =>
  rs.map((r) => (
    <span key={r.name} className={`gh-rel t${r.tone + 1}`}>
      {r.name}
    </span>
  ));

function Method() {
  return (
    <section className="card method">
      <h2>감정 기준 및 고지</h2>
      <ol>
        <li><b>세운·월운:</b> 그해와 달마다의 간지를 절기 기준으로 세우고(양력 각 달 20일이 속한 절기 달), 의뢰인의 일간에 대한 십신과 참고 용신에 얼마나 맞는지(50이 중립)를 매겼습니다.</li>
        <li><b>합충:</b> 그해의 천간과 일간, 그해의 지지와 원국 네 지지의 합·충·형·해·파·원진을 살폈습니다.</li>
        <li><b>삼재:</b> 태어난 해의 띠(년지) 삼합을 기준으로 전통 삼재 세 해(들·눌·날삼재)에 드는지 보았습니다.</li>
        <li><b>고지:</b> 전통 명리에 바탕을 둔 참고 자료이며, 결과를 보장하지 않습니다. 중요한 결정은 의뢰인의 판단을 따르세요.</li>
      </ol>
    </section>
  );
}

export default function NewyearReport({ chart, data, pending, notice, title }: { chart: SajuChart; data: NewyearResult | null; pending: ReactNode; notice?: ReactNode; title: string }) {
  const c = data?.computed;
  return (
    <div className="report extra newyear">
      <Cover chart={chart} intro={null} title={title} years={c ? `${c.year} ${c.ganzhi}` : null} tagline={["한 해의 간지가 내 명식에", "들어오는 모습을 읽다"]} />
      {notice}
      {c && data ? (
        <>
          <section className="part extra-part">
            <header className="part-head">
              <span>序</span>
              <h2>{c.year}년 {c.ganzhi}, {c.animal}띠 해</h2>
              <p>{data.text.summary}</p>
            </header>
            <PillarsCard chart={chart} />
            <section className="card">
              <h2>한 해의 바탕</h2>
              <div className="kv">
                <div><span>그해의 간지</span><b>{c.ganzhi}</b><small>{c.animal}띠 해</small></div>
                <div><span>나에게 오는 기운(십신)</span><b>{c.stemTenGod} · {c.branchTenGod}</b><small>천간 · 지지</small></div>
                <div><span>용신 부합도</span><b>{c.score} / 100</b><small>50이 중립 · 참고 용신 {ELEMENT_KO[c.yongsin]}</small></div>
                <div><span>삼재</span><b>{c.samjae ?? "해당 없음"}</b><small>띠 기준 전통 삼재</small></div>
                <div>
                  <span>대운</span>
                  <b>{c.daeun ? `${c.daeun.ganzhi} 대운` : "대운 시작 전"}</b>
                  <small>{c.daeun ? `${c.daeun.startYear}~${c.daeun.endYear}${c.daeun.changes ? " · 올해 새 대운 시작" : ""}${c.daeun.next ? ` · 다음 해 ${c.daeun.next} 대운` : ""}` : ""}</small>
                </div>
              </div>
            </section>
            <section className="card">
              <h2>내 명식과 만나는 자리</h2>
              <table className="table gh-table">
                <tbody>
                  {c.withChart.map((w) => (
                    <tr key={w.label}>
                      <th>{w.label} {w.target}</th>
                      <td>
                        {c.ganzhi} ↔ {w.target} {w.relations.length ? rels(w.relations) : <span className="gh-rel t1">뚜렷한 합·충 없음</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </section>

          <SectionsBody text={{ ...data.text, advice: [] }} />

          <section className="part extra-part">
            <header className="part-head">
              <span>月</span>
              <h2>열두 달의 흐름</h2>
              <p>좋은 달 {c.best.map((m) => `${m}월`).join(", ")} · 살필 달 {c.care.map((m) => `${m}월`).join(", ")}</p>
            </header>
            {c.months.map((m, i) => (
              <section key={i} className={`card ny-month${c.best.includes(i + 1) ? " good" : c.care.includes(i + 1) ? " care" : ""}`}>
                <div className="ny-month-head">
                  <h3>
                    {i + 1}월 <span>{m.stem}{m.branch}</span>
                  </h3>
                  <span className="gh-mini-row">
                    <i className="gh-mini" aria-hidden>
                      <em style={{ width: `${m.score}%` }} />
                    </i>
                    <b>{m.score}</b>
                  </span>
                </div>
                <p className="muted small">
                  절입 {m.startDate} · {m.stemTenGod}/{m.branchTenGod} · {m.mark} {rels(m.withDay)}
                </p>
                <p>{data.text.months[i]}</p>
              </section>
            ))}
          </section>

          <SectionsBody text={{ summary: "", sections: [], advice: data.text.advice }} adviceTitle={`${c.year}년에 실천할 일`} />
          <section className="card">
            <h2>한 해의 개운</h2>
            <div className="kv">
              <div><span>색</span><b>{c.lucky.colors}</b></div>
              <div><span>방향</span><b>{c.lucky.direction}</b></div>
              <div><span>숫자</span><b>{c.lucky.numbers}</b></div>
              <div><span>습관</span><b style={{ fontSize: 14 }}>{c.lucky.habits}</b></div>
            </div>
          </section>
          <Method />
        </>
      ) : (
        pending
      )}
      <ExtraFooter chart={chart} />
    </div>
  );
}
