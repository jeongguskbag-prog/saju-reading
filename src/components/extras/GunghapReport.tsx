"use client";
import type { CSSProperties, ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import { ELEMENT_KO, type Element } from "@/lib/saju/constants";
import type { GunghapComputed, GunghapPerson, GunghapResult } from "@/lib/extras/gunghap";
import { GUNGHAP_RELATIONS } from "@/lib/extras/requests";
import type { Relation } from "@/lib/extras/relations";
import { Cover } from "../ReportView";
import { ExtraFooter, SectionsBody } from "./ExtraReport";

const elVar = (e: Element) => ({ "--el": `var(--el-${e})` }) as CSSProperties;
const ORDER = ["시주", "일주", "월주", "년주"] as const;

function People({ c }: { c: GunghapComputed }) {
  const col = (p: GunghapPerson) => (
    <div className="gh-person">
      <h3>
        {p.name} <small>{p.gender === "male" ? "乾命" : "坤命"}</small>
      </h3>
      <div className="gh-pillars">
        {ORDER.map((label) => {
          const x = p.pillars.find((q) => q.label === label);
          return (
            <div key={label} className={label === "일주" ? "day" : undefined}>
              <small>{label}</small>
              {x ? (
                <>
                  <b style={elVar(x.stemElement)}>{x.stem}</b>
                  <b style={elVar(x.branchElement)}>{x.branch}</b>
                </>
              ) : (
                <span className="muted">모름</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="muted small">
        양력 {p.solarDate} · 일간 {p.dayMaster.stem} {ELEMENT_KO[p.dayMaster.element]} · {p.zodiac}
      </p>
    </div>
  );
  return (
    <section className="card gh-people">
      <h2>두 사람의 명식</h2>
      <div className="gh-pair">
        {col(c.a)}
        <span className="gh-amp" aria-hidden>緣</span>
        {col(c.b)}
      </div>
    </section>
  );
}

function Score({ c }: { c: GunghapComputed }) {
  return (
    <section className="card gh-score">
      <div className="gh-total">
        <span className="gh-total-num">{c.total}</span>
        <span className="gh-total-max">/ 100</span>
      </div>
      <p className="gh-tier">{c.tier.name}</p>
      <p className="muted">{c.tier.desc}</p>
      <ul className="gh-bars">
        {c.scores.map((s) => (
          <li key={s.label}>
            <span>{s.label}</span>
            <i aria-hidden>
              <em style={{ width: `${Math.round((s.score / s.max) * 100)}%` }} />
            </i>
            <b>
              {s.score}/{s.max}
            </b>
          </li>
        ))}
      </ul>
      <p className="muted small">점수는 두 명식의 관계를 정리한 참고 지표이며, 관계의 좋고 나쁨을 정하지 않습니다.</p>
    </section>
  );
}

const rels = (rs: Relation[]) =>
  rs.length ? (
    rs.map((r) => (
      <span key={r.name} className={`gh-rel t${r.tone + 1}`}>
        {r.name}
      </span>
    ))
  ) : (
    <span className="gh-rel t1">뚜렷한 합·충 없음</span>
  );

function Relations({ c }: { c: GunghapComputed }) {
  const els = (xs: Element[]) => (xs.length ? xs.map((e) => ELEMENT_KO[e]).join(", ") : "뚜렷하지 않음");
  return (
    <section className="card">
      <h2>관계의 근거</h2>
      <table className="table gh-table">
        <tbody>
          <tr>
            <th>일간(마음의 결)</th>
            <td>
              {c.a.dayMaster.stem} · {c.b.dayMaster.stem} {rels(c.dayMaster.relations)}
              <p className="muted small">{c.dayMaster.flow}</p>
            </td>
          </tr>
          <tr>
            <th>{c.relation === "business" ? "일지(함께 일하는 자리)" : "일지(배우자 자리)"}</th>
            <td>
              {c.spouse.a} · {c.spouse.b} {rels(c.spouse.relations)}
            </td>
          </tr>
          <tr>
            <th>년지(띠)</th>
            <td>
              {c.zodiac.a} · {c.zodiac.b} {rels(c.zodiac.relations)}
            </td>
          </tr>
          <tr>
            <th>오행 보완</th>
            <td>
              {c.a.name} → {c.b.name}: {els(c.complement.aGivesB)}
              <br />
              {c.b.name} → {c.a.name}: {els(c.complement.bGivesA)}
            </td>
          </tr>
          <tr>
            <th>용신 도움</th>
            <td>
              {c.a.name} 님 명식 속 {c.b.name} 님의 용신 {ELEMENT_KO[c.b.yongsin]} 기운 {c.yongsinHelp.aToB}%
              <br />
              {c.b.name} 님 명식 속 {c.a.name} 님의 용신 {ELEMENT_KO[c.a.yongsin]} 기운 {c.yongsinHelp.bToA}%
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function Timeline({ c }: { c: GunghapComputed }) {
  const bar = (v: number | null) => (v === null ? <span className="muted">-</span> : <span className="gh-mini-row"><i className="gh-mini" aria-hidden><em style={{ width: `${v}%` }} /></i><b>{v}</b></span>);
  return (
    <section className="card">
      <h2>함께 걷는 대운</h2>
      <p className="muted small">5년 간격으로, 그해에 걸친 두 분 각자의 대운이 용신과 얼마나 맞는지(100점 기준)를 나란히 놓았습니다.</p>
      <table className="table gh-time">
        <thead>
          <tr>
            <th>해</th>
            <th>{c.a.name}</th>
            <th>{c.b.name}</th>
          </tr>
        </thead>
        <tbody>
          {c.timeline.map((t) => (
            <tr key={t.year}>
              <td>{t.year}</td>
              <td>{bar(t.a)}</td>
              <td>{bar(t.b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Method() {
  return (
    <section className="card method">
      <h2>감정 기준 및 고지</h2>
      <ol>
        <li><b>명식:</b> 두 분의 생년월일시를 절기 시각 기준 만세력으로 세웠습니다(진태양시 보정 포함). 태어난 시각을 모르면 세 기둥으로 봅니다.</li>
        <li><b>근거:</b> 일간끼리의 생극·천간합, 일지(배우자 자리)와 년지(띠)의 육합·삼합·충·형·해·파·원진, 오행 보완, 서로의 용신 기운, 대운 흐름을 함께 따졌습니다.</li>
        <li><b>점수:</b> 마음의 결 25, 생활(일지) 25, 오행 보완 25, 용신 도움 15, 띠 10으로 정리한 참고 지표입니다.</li>
        <li><b>고지:</b> 궁합은 전통 명리에 바탕을 둔 참고 자료이며, 관계를 맺거나 끝내는 결정은 두 분의 몫입니다.</li>
      </ol>
    </section>
  );
}

export default function GunghapReport({
  chart,
  data,
  pending,
  notice,
  title,
}: {
  chart: SajuChart;
  data: GunghapResult | null;
  pending: ReactNode;
  notice?: ReactNode;
  title: string;
}) {
  const c = data?.computed;
  return (
    <div className="report extra gunghap">
      <Cover
        chart={chart}
        intro={null}
        title={title}
        years={null}
        tagline={["두 명식이 서로를 비추고", "채우는 인연의 기록"]}
        extra={c ? <p className="cover-keywords">{GUNGHAP_RELATIONS[c.relation]} · {c.b.name} 님과의 연분</p> : null}
      />
      {notice}
      {c && data ? (
        <>
          <section className="part extra-part">
            <header className="part-head">
              <span>序</span>
              <h2>두 사람의 인연</h2>
              <p>{data.text.summary}</p>
            </header>
            <People c={c} />
            <Score c={c} />
            <Relations c={c} />
            <Timeline c={c} />
          </section>
          <SectionsBody text={data.text} adviceTitle="두 분이 함께 실천할 일" />
          <Method />
        </>
      ) : (
        pending
      )}
      <ExtraFooter chart={chart} />
    </div>
  );
}
