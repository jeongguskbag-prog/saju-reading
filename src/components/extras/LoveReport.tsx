"use client";
import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import type { LoveComputed, LoveResult } from "@/lib/extras/love";
import { Cover } from "../ReportView";
import { ExtraFooter, SectionsBody } from "./ExtraReport";

function Timing({ title, items, empty }: { title: string; items: LoveComputed["years"]; empty: string }) {
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

/** 연애운 숏 감정서: 계산값(배우자성·배우자 자리·도화·인연 시기) 카드 + AI 문장 */
export default function LoveReport({ chart, data, pending, notice, title }: { chart: SajuChart; data: LoveResult | null; pending: ReactNode; notice?: ReactNode; title: string }) {
  const c = data?.computed;
  return (
    <div className="report extra love">
      <Cover chart={chart} intro={null} title={title} years={null} tagline={["나의 사랑과", "인연이 드는 때"]} />
      {notice}
      {c && data ? (
        <>
          <section className="part extra-part">
            <header className="part-head">
              <span>緣</span>
              <h2>연애운 한눈에</h2>
              <p>{data.text.summary}</p>
            </header>
            <section className="card love-facts">
              <dl>
                <div>
                  <dt>배우자성</dt>
                  <dd>
                    {c.spouseStar.name} {c.spouseStar.count}개
                  </dd>
                </div>
                <div>
                  <dt>배우자 자리(일지)</dt>
                  <dd>
                    {c.spousePalace.branch} · {c.spousePalace.tenGod}
                  </dd>
                </div>
                <div>
                  <dt>도화(桃花)</dt>
                  <dd>
                    {c.peach.branch}({c.peach.animal}) · {c.peach.inChart ? "원국에 있음" : "원국에 없음"}
                  </dd>
                </div>
                <div>
                  <dt>잘 맞는 띠(참고)</dt>
                  <dd>{c.goodAnimals.join(", ")}</dd>
                </div>
              </dl>
              <Timing title="인연이 드는 해 (앞으로 3년)" items={c.years} empty="앞으로 3년 중 뚜렷한 해는 없습니다. 스스로 인연을 만들어 가는 시기입니다." />
              <Timing title="인연이 드는 달 (올해·내년)" items={c.months} empty="올해·내년 중 뚜렷한 달은 없습니다." />
            </section>
          </section>
          <SectionsBody text={data.text} adviceTitle="연애운을 살리는 실천" />
        </>
      ) : (
        pending
      )}
      <ExtraFooter chart={chart} />
    </div>
  );
}
