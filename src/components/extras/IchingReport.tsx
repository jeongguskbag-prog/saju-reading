"use client";
import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import type { Hexagram, IchingComputed, IchingResult, LineValue } from "@/lib/extras/iching";
import { ICHING_TOPICS } from "@/lib/extras/requests";
import { Cover } from "../ReportView";
import { ExtraFooter, SectionsBody } from "./ExtraReport";

const POS = ["초", "2", "3", "4", "5", "상"];

/** 괘 그림: 위(상효)부터 아래(초효)로 그린다. 움직이는 효는 ○(노양)·×(노음) 표시 */
function HexFigure({ bits, values, label }: { bits: string; values?: LineValue[]; label: string }) {
  const rows = [5, 4, 3, 2, 1, 0];
  return (
    <div className="ic-fig" role="img" aria-label={label}>
      {rows.map((i) => {
        const yang = bits[i] === "1";
        const v = values?.[i];
        const moving = v === 6 || v === 9;
        return (
          <div key={i} className={`ic-line${yang ? " yang" : " yin"}${moving ? " moving" : ""}`}>
            <i />
            {!yang && <i />}
            {values && <small>{moving ? (v === 9 ? "○" : "×") : ""}</small>}
          </div>
        );
      })}
    </div>
  );
}

function HexCard({ h, role, values, moving }: { h: Hexagram; role: string; values?: LineValue[]; moving?: number[] }) {
  return (
    <section className="card ic-hex">
      <p className="ic-role">{role}</p>
      <div className="ic-hex-top">
        <HexFigure bits={h.bits} values={values} label={`${h.full} 괘상`} />
        <div>
          <h3>
            {h.full} <small>제{h.n}괘 · {h.ko}괘</small>
          </h3>
          <p className="muted small">
            위 {h.upper} · 아래 {h.lower}
          </p>
          <p className="ic-text">{h.judgment}</p>
          <p className="ic-text muted">大象 {h.image}</p>
        </div>
      </div>
      {moving && moving.length > 0 && (
        <ul className="ic-moving">
          {moving.map((i) => (
            <li key={i}>
              <b>{POS[i]}효 움직임</b> {h.lines[i]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Method() {
  return (
    <section className="card method">
      <h2>점법 및 고지</h2>
      <ol>
        <li><b>괘 얻기:</b> 결제 뒤 서버에서 한 번, 시초점(대연지수 50책)과 같은 확률(노음 1/16·소양 5/16·소음 7/16·노양 3/16)로 여섯 효를 아래에서부터 얻었습니다. 얻은 괘는 저장되어 바뀌지 않습니다.</li>
        <li><b>읽는 법:</b> 움직이는 효의 수에 따라 주희 『역학계몽』의 변효 점법을 따랐습니다.</li>
        <li><b>원문:</b> 괘사·효사·대상은 『주역』 원문입니다(공개 데이터의 간체·번체 변환 오류를 바로잡아 사용).</li>
        <li><b>고지:</b> 주역 점은 지금의 형세와 처신을 비추는 참고 자료이며, 미래를 확정하지 않습니다.</li>
      </ol>
    </section>
  );
}

export default function IchingReport({ chart, data, pending, notice, title }: { chart: SajuChart; data: IchingResult | null; pending: ReactNode; notice?: ReactNode; title: string }) {
  const c: IchingComputed | undefined = data?.computed;
  return (
    <div className="report extra iching">
      <Cover
        chart={chart}
        intro={null}
        title={title}
        years={c ? `${c.primary.full}${c.changed ? ` → ${c.changed.full}` : ""}` : null}
        tagline={["한 가지 물음에", "괘로 답하다"]}
      />
      {notice}
      {c && data ? (
        <>
          <section className="part extra-part">
            <header className="part-head">
              <span>問</span>
              <h2>물음</h2>
              <p>{data.text.summary}</p>
            </header>
            <section className="card ic-question">
              <p className="muted small">{ICHING_TOPICS[c.topic]}</p>
              <p className="ic-q">“{c.question}”</p>
            </section>
            <HexCard h={c.primary} role="본괘(本卦) · 지금의 형세" values={c.values} moving={c.moving} />
            {c.changed && <HexCard h={c.changed} role="지괘(之卦) · 움직여 가는 곳" />}
            <section className="card ic-focus">
              <h2>점사(占辭) 원문</h2>
              <p className="muted small">{c.rule}</p>
              {c.focus.map((f, i) => (
                <blockquote key={i} className={i === 0 ? "main" : undefined}>
                  <small>{f.source}</small>
                  {f.text}
                </blockquote>
              ))}
            </section>
          </section>
          <SectionsBody text={data.text} adviceTitle="물음에 대한 실천" />
          <Method />
        </>
      ) : (
        pending
      )}
      <ExtraFooter chart={chart} />
    </div>
  );
}
