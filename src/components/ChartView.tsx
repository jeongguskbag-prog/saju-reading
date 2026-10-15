import type { CSSProperties } from "react";
import type { Pillar, SajuChart } from "@/lib/saju/calc";
import { ELEMENTS, ELEMENT_KO, type Element } from "@/lib/saju/constants";

const elVar = (e: Element) => ({ "--el": `var(--el-${e})` }) as CSSProperties;

function PillarColumn({ pillar, label, isDay }: { pillar: Pillar | null; label: string; isDay?: boolean }) {
  if (!pillar) {
    return (
      <div className="pillar" style={{ display: "grid", gap: 4 }}>
        <div className="head">{label}</div>
        <div className="god" />
        <div className="glyph empty"><div className="hanja">?</div><div className="ko">모름</div></div>
        <div className="glyph empty"><div className="hanja">?</div><div className="ko">모름</div></div>
        <div className="god" />
      </div>
    );
  }
  return (
    <div className="pillar" style={{ display: "grid", gap: 4 }}>
      <div className="head">{label}</div>
      <div className="god">{pillar.stemTenGod ?? "일간(나)"}</div>
      <div className={`glyph${isDay ? " day" : ""}`} style={elVar(pillar.stemElement)} title={ELEMENT_KO[pillar.stemElement]}>
        <div className="hanja">{pillar.stem}</div>
        <div className="ko">{pillar.stemKo} · {ELEMENT_KO[pillar.stemElement].slice(0, 1)}</div>
      </div>
      <div className="glyph" style={elVar(pillar.branchElement)} title={ELEMENT_KO[pillar.branchElement]}>
        <div className="hanja">{pillar.branch}</div>
        <div className="ko">{pillar.branchKo} · {ELEMENT_KO[pillar.branchElement].slice(0, 1)}</div>
      </div>
      <div className="god">{pillar.branchTenGod}</div>
      <div className="hidden-stems" title="지장간">{pillar.hiddenStems.map((h) => h.stem).join(" ")}</div>
    </div>
  );
}

export function PillarsCard({ chart }: { chart: SajuChart }) {
  const { pillars } = chart;
  return (
    <section className="card">
      <h2>{chart.input.name ? `${chart.input.name} 님의 사주 명식` : "사주 명식"}</h2>
      <div className="pillars">
        <PillarColumn pillar={pillars.hour} label="시주" />
        <PillarColumn pillar={pillars.day} label="일주" isDay />
        <PillarColumn pillar={pillars.month} label="월주" />
        <PillarColumn pillar={pillars.year} label="년주" />
      </div>
      <div className="facts">
        <span>양력 <b>{chart.solarDate}</b></span>
        <span>음력 <b>{chart.lunarDate}</b></span>
        <span>일간 <b>{chart.dayMaster.stem}({chart.dayMaster.ko}) {ELEMENT_KO[chart.dayMaster.element]}</b></span>
        <span>띠 <b>{chart.zodiac}</b></span>
        <span>신강·신약 <b>{chart.strength.label}</b> (참고 {chart.strength.score}점)</span>
      </div>
      {(chart.timeNote || chart.warnings.length > 0) && (
        <ul className="notes">
          {chart.timeNote && <li>{chart.timeNote}</li>}
          {chart.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </section>
  );
}

/** 오행 비중 도넛 차트. 조각 사이에 바탕색 간격을 두고, 색만으로 구분하지 않도록 범례에 이름과 값을 함께 적는다. */
function ElementDonut({ chart }: { chart: SajuChart }) {
  const { weighted } = chart.elements;
  const total = ELEMENTS.reduce((s, e) => s + weighted[e], 0) || 1;
  const R = 80;
  const r = 50;
  let angle = -Math.PI / 2;
  const slices = ELEMENTS.filter((e) => weighted[e] > 0).map((e) => {
    const sweep = (weighted[e] / total) * Math.PI * 2;
    const a0 = angle;
    const a1 = angle + sweep;
    angle = a1;
    const large = sweep > Math.PI ? 1 : 0;
    const p = (rad: number, rr: number) => `${100 + rr * Math.cos(rad)} ${100 + rr * Math.sin(rad)}`;
    // 한 오행이 100%면 원 두 개로 그린다.
    const d =
      sweep >= Math.PI * 2 - 1e-6
        ? `M ${p(0, R)} A ${R} ${R} 0 1 1 ${p(Math.PI, R)} A ${R} ${R} 0 1 1 ${p(0, R)} M ${p(0, r)} A ${r} ${r} 0 1 0 ${p(Math.PI, r)} A ${r} ${r} 0 1 0 ${p(0, r)} Z`
        : `M ${p(a0, R)} A ${R} ${R} 0 ${large} 1 ${p(a1, R)} L ${p(a1, r)} A ${r} ${r} 0 ${large} 0 ${p(a0, r)} Z`;
    return { e, d, pct: Math.round((weighted[e] / total) * 100) };
  });
  const dm = chart.dayMaster;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 200 200" className="donut" role="img" aria-label="오행 비중 원형 차트">
        {slices.map((s) => (
          <path key={s.e} d={s.d} fill={`var(--el-${s.e})`} stroke="var(--surface)" strokeWidth={2} fillRule="evenodd">
            <title>{`${ELEMENT_KO[s.e]} ${s.pct}%`}</title>
          </path>
        ))}
        <text x="100" y="96" textAnchor="middle" className="donut-center">{dm.stem}</text>
        <text x="100" y="118" textAnchor="middle" className="donut-sub">일간 {ELEMENT_KO[dm.element].slice(0, 1)}</text>
      </svg>
      <ul className="legend">
        {ELEMENTS.map((e) => (
          <li key={e} style={elVar(e)}>
            <span className="swatch" aria-hidden />
            <span className="lname">{ELEMENT_KO[e]}</span>
            <span className="lval">
              {Math.round((weighted[e] / total) * 100)}% · 글자 {chart.elements.counts[e]}개
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ElementCard({ chart }: { chart: SajuChart }) {
  const missing = ELEMENTS.filter((e) => chart.elements.counts[e] === 0).map((e) => ELEMENT_KO[e]);
  return (
    <section className="card">
      <h2>오행 밸런스</h2>
      <ElementDonut chart={chart} />
      <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
        비중은 지장간까지 나눠 더한 점수 기준이며, 글자 수는 겉으로 드러난 여덟(또는 여섯) 글자 기준입니다.
        {missing.length > 0 && ` 원국에 없는 오행: ${missing.join(", ")}.`}
      </p>
    </section>
  );
}

export function AnalysisCard({ chart }: { chart: SajuChart }) {
  const a = chart.analysis;
  const u = a.usefulness;
  return (
    <section className="card">
      <h2>격국과 참고 용신</h2>
      <div className="kv">
        <div><span>격국</span><b>{a.gyeokguk.name}</b><small>{a.gyeokguk.basis}</small></div>
        <div style={elVar(u.yongsin)}><span>참고 용신</span><b><i className="swatch" aria-hidden />{ELEMENT_KO[u.yongsin]}</b><small>삶의 균형을 잡아 주는 기운</small></div>
        <div style={elVar(u.huisin)}><span>희신</span><b><i className="swatch" aria-hidden />{ELEMENT_KO[u.huisin]}</b><small>용신을 돕는 기운</small></div>
        <div style={elVar(u.gisin)}><span>기신</span><b><i className="swatch" aria-hidden />{ELEMENT_KO[u.gisin]}</b><small>조절이 필요한 기운</small></div>
      </div>
      <p className="muted" style={{ margin: "10px 0 0" }}>{u.method}. 학파에 따라 판단이 다를 수 있어 참고용으로 제시합니다.</p>
      <h3>나의 십신, 현대어로 읽기</h3>
      <table className="table">
        <thead>
          <tr><th>십신</th><th>개수</th><th>현대적 해석</th></tr>
        </thead>
        <tbody>
          {a.tenGodGuide.map((g) => (
            <tr key={g.god}><td>{g.god}</td><td>{g.count}</td><td>{g.modern}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** 대운별 용신 부합도 곡선. 한 줄짜리 시계열이라 범례 없이 제목으로 설명한다. */
function DaeunCurve({ chart }: { chart: SajuChart }) {
  const pts = chart.analysis.daeunScores;
  if (pts.length === 0) return null;
  const W = 640;
  const H = 230;
  const left = 56;
  const right = 20;
  const top = 18;
  const plotH = 140;
  const step = pts.length > 1 ? (W - left - right) / (pts.length - 1) : 0;
  const x = (i: number) => left + i * step;
  const y = (s: number) => top + (1 - s / 100) * plotH;
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.score)}`).join(" ");
  const area = `${line} L ${x(pts.length - 1)} ${top + plotH} L ${x(0)} ${top + plotH} Z`;
  const currentYear = chart.daeun.current?.startYear;
  const best = Math.max(...pts.map((p) => p.score));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="curve" role="img" aria-label="10년 대운 흐름 그래프">
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={left} x2={W - right} y1={y(g)} y2={y(g)} stroke="var(--grid)" strokeWidth={1} />
          <text x={left - 8} y={y(g) + 4} textAnchor="end" className="axis">{g === 100 ? "순풍" : g === 50 ? "보통" : "조심"}</text>
        </g>
      ))}
      <path d={area} fill="var(--accent)" opacity={0.08} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      {pts.map((p, i) => {
        const isCurrent = p.startYear === currentYear;
        return (
          <g key={p.startYear}>
            <circle cx={x(i)} cy={y(p.score)} r={isCurrent ? 7 : 5} fill={isCurrent ? "var(--accent)" : "var(--surface)"} stroke="var(--accent)" strokeWidth={2}>
              <title>{`${p.startAge}세 ${p.ganzhi} · 부합도 ${p.score}`}</title>
            </circle>
            {(isCurrent || p.score === best) && (
              <text x={x(i)} y={y(p.score) - 12} textAnchor="middle" className="point-label">{isCurrent ? "현재" : "전성기"}</text>
            )}
            <text x={x(i)} y={top + plotH + 22} textAnchor="middle" className="axis strong">{p.startAge}세</text>
            <text x={x(i)} y={top + plotH + 40} textAnchor="middle" className="axis">{p.ganzhi}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function DaeunCard({ chart }: { chart: SajuChart }) {
  const { daeun } = chart;
  return (
    <section className="card">
      <h2>10년 대운 흐름 <span className="muted">({daeun.forward ? "순행" : "역행"}, {daeun.startAge}세 시작)</span></h2>
      <DaeunCurve chart={chart} />
      <p className="muted" style={{ margin: "4px 0 12px" }}>
        곡선은 각 대운이 참고 용신({ELEMENT_KO[chart.analysis.usefulness.yongsin]})과 얼마나 맞는지를 나타낸 참고 지표입니다.
      </p>
      <div className="daeun">
        {daeun.periods.map((p) => (
          <div key={p.startYear} className={`item${daeun.current?.startYear === p.startYear ? " current" : ""}`}>
            <div className="age">{p.startAge}세</div>
            <div className="gz">{p.stem}{p.branch}</div>
            <div>{p.ko}</div>
            <div className="gods">{p.stemTenGod}·{p.branchTenGod}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const MARK_ICON = { 좋음: "●", 보통: "○", 주의: "▲" } as const;

export function YearFlowCard({ chart }: { chart: SajuChart }) {
  const a = chart.analysis;
  return (
    <section className="card">
      <h2>{a.reportYears[0]}-{a.reportYears[1]} 세운과 월별 흐름</h2>
      <div className="year-scores">
        {a.yearScores.map((y) => (
          <div key={y.year}>
            <span>{y.year}년</span>
            <b>{y.ganzhi}</b>
            <small>용신 부합도 {y.score}/100</small>
          </div>
        ))}
      </div>
      {a.reportYears.map((year) => (
        <div key={year} className="month-block">
          <h3>{year}년 월별 흐름</h3>
          <table className="table months">
            <thead>
              <tr><th>절입일</th><th>월</th><th>키워드(십신)</th><th>흐름</th></tr>
            </thead>
            <tbody>
              {a.monthly
                .filter((m) => m.year === year)
                .map((m) => (
                  <tr key={m.startDate}>
                    <td>{Number(m.startDate.slice(5, 7))}/{Number(m.startDate.slice(8))}~</td>
                    <td>{m.stem}{m.branch}</td>
                    <td>{m.stemTenGod}·{m.branchTenGod}</td>
                    <td className={`mark ${m.mark}`}>{MARK_ICON[m.mark]} {m.mark}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="muted" style={{ margin: "8px 0 0" }}>달은 절기(절입일)를 기준으로 바뀝니다. 흐름 표시는 참고 용신과의 부합도로 정했습니다.</p>
    </section>
  );
}

export function LuckyCard({ chart }: { chart: SajuChart }) {
  const l = chart.analysis.lucky;
  return (
    <section className="card lucky" style={elVar(l.element)}>
      <h2>행운의 색상·숫자·방위</h2>
      <div className="kv">
        <div><span>행운의 오행</span><b><i className="swatch" aria-hidden />{ELEMENT_KO[l.element]}</b></div>
        <div><span>색상</span><b>{l.colors}</b></div>
        <div><span>숫자</span><b>{l.numbers}</b></div>
        <div><span>방위</span><b>{l.direction}</b></div>
      </div>
      <p className="muted" style={{ margin: "10px 0 0" }}>도움이 되는 습관: {l.habits}</p>
    </section>
  );
}
