"use client";
import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import type { GlanceResult } from "@/lib/extras/glance";
import { Cover } from "../ReportView";
import { ExtraFooter, SectionsBody } from "./ExtraReport";

/** 990원 한 장 운세: 해의 간지·점수·좋은 달 카드 + 정해진 문장(AI 없음) */
export default function GlanceReport({ chart, data, pending, notice, title }: { chart: SajuChart; data: GlanceResult | null; pending: ReactNode; notice?: ReactNode; title: string }) {
  const c = data?.computed;
  return (
    <div className="report extra love glance">
      <Cover chart={chart} intro={null} title={title} years={null} tagline={[c ? `${c.year}년` : "한 해를", "한 장으로 보기"]} />
      {notice}
      {c && data ? (
        <>
          <section className="part extra-part">
            <header className="part-head">
              <span>歲</span>
              <h2>
                {c.year}년 {c.ganzhi}({c.reading})년 · {c.animal}의 해
              </h2>
              <p>{data.text.summary}</p>
            </header>
            <section className="card love-facts">
              <dl>
                <div>
                  <dt>한 해의 흐름</dt>
                  <dd>
                    {c.mark} · {c.score}/100
                  </dd>
                </div>
                <div>
                  <dt>좋은 달</dt>
                  <dd>{c.best.map((m) => `${m}월`).join(", ")}</dd>
                </div>
                <div>
                  <dt>살필 달</dt>
                  <dd>{c.care.map((m) => `${m}월`).join(", ")}</dd>
                </div>
                <div>
                  <dt>행운 색</dt>
                  <dd>{c.lucky.colors}</dd>
                </div>
              </dl>
            </section>
          </section>
          <SectionsBody text={data.text} adviceTitle="한 해를 잘 보내는 법" />
        </>
      ) : (
        pending
      )}
      <ExtraFooter chart={chart} />
    </div>
  );
}
