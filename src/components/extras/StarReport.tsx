"use client";
import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import type { StarComputed, StarKind, StarResult } from "@/lib/extras/stars";
import { Cover } from "../ReportView";
import { ExtraFooter, SectionsBody } from "./ExtraReport";

const COPY: Record<StarKind, { seal: string; head: string; tagline: [string, string]; years: string; advice: string }> = {
  money: { seal: "財", head: "재물운 한눈에", tagline: ["나의 돈 그릇과", "재물이 드는 때"], years: "재물이 드는 해 (앞으로 3년)", advice: "재물운을 살리는 실천" },
  career: { seal: "職", head: "커리어 한눈에", tagline: ["나의 일하는 방식과", "일이 풀리는 때"], years: "일이 풀리는 해 (앞으로 3년)", advice: "커리어를 살리는 실천" },
};

function Timing({ title, items, empty }: { title: string; items: StarComputed["years"]; empty: string }) {
  return (
    <div className="love-timing">
      <h3>{title}</h3>
      {items.length ? (
        <ul>
          {items.map((t) => (
            <li key={t.label}>
              <b>
                {t.label} <small>{t.ganzhi}</small>
              </b>
              <span>{t.reasons.join(" · ")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted small">{empty}</p>
      )}
    </div>
  );
}

/** 재물운·커리어 숏 감정서: 계산값 카드 + AI 문장 */
export default function StarReport({ kind, chart, data, pending, notice, title }: { kind: StarKind; chart: SajuChart; data: StarResult | null; pending: ReactNode; notice?: ReactNode; title: string }) {
  const c = data?.computed;
  const k = COPY[kind];
  return (
    <div className={`report extra love ${kind}`}>
      <Cover chart={chart} intro={null} title={title} years={null} tagline={k.tagline} />
      {notice}
      {c && data ? (
        <>
          <section className="part extra-part">
            <header className="part-head">
              <span>{k.seal}</span>
              <h2>{k.head}</h2>
              <p>{data.text.summary}</p>
            </header>
            <section className="card love-facts">
              <dl>
                <div>
                  <dt>{c.main.name}</dt>
                  <dd>
                    {c.main.count}개{c.main.where.length ? ` · ${c.main.where.join(", ")}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>받쳐 주는 별 {c.support.name}</dt>
                  <dd>{c.support.count}개</dd>
                </div>
                <div>
                  <dt>견제하는 별 {c.rival.name}</dt>
                  <dd>{c.rival.count}개</dd>
                </div>
                <div>
                  <dt>격국 · 참고 용신</dt>
                  <dd>
                    {c.gyeokguk} · {c.yongsin}
                  </dd>
                </div>
              </dl>
              <Timing title={k.years} items={c.years} empty="앞으로 3년 중 뚜렷한 해는 없습니다. 기반을 다지는 시기입니다." />
              <Timing title="지금과 다음 대운" items={c.daeun} empty="" />
            </section>
          </section>
          <SectionsBody text={data.text} adviceTitle={k.advice} />
        </>
      ) : (
        pending
      )}
      <ExtraFooter chart={chart} />
    </div>
  );
}
