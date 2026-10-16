import type { CSSProperties } from "react";
import type { Pillar, SajuChart } from "@/lib/saju/calc";
import { ELEMENTS, type Element } from "@/lib/saju/constants";
import { getMessages, type Locale, type Messages } from "@/lib/i18n";

const elVar = (e: Element) => ({ "--el": `var(--el-${e})` }) as CSSProperties;

function PillarColumn({ pillar, label, isDay, t }: { pillar: Pillar | null; label: string; isDay?: boolean; t: Messages }) {
  const c = t.chart;
  if (!pillar) {
    return (
      <div className="pillar" style={{ display: "grid", gap: 4 }}>
        <div className="head">{label}</div>
        <div className="god" />
        <div className="glyph empty"><div className="hanja">?</div><div className="ko">{c.unknown}</div></div>
        <div className="glyph empty"><div className="hanja">?</div><div className="ko">{c.unknown}</div></div>
        <div className="god" />
      </div>
    );
  }
  return (
    <div className="pillar" style={{ display: "grid", gap: 4 }}>
      <div className="head">{label}</div>
      <div className="god">{pillar.stemTenGod ? c.tenGod[pillar.stemTenGod] : c.dayMaster}</div>
      <div className={`glyph${isDay ? " day" : ""}`} style={elVar(pillar.stemElement)} title={c.element[pillar.stemElement]}>
        <div className="hanja">{pillar.stem}</div>
        <div className="ko">{c.glyphReading(pillar.stemKo, pillar.stemElement)}</div>
      </div>
      <div className="glyph" style={elVar(pillar.branchElement)} title={c.element[pillar.branchElement]}>
        <div className="hanja">{pillar.branch}</div>
        <div className="ko">{c.glyphReading(pillar.branchKo, pillar.branchElement)}</div>
      </div>
      <div className="god">{c.tenGod[pillar.branchTenGod]}</div>
      <div className="hidden-stems" title={c.hiddenStems}>{pillar.hiddenStems.map((h) => h.stem).join(" ")}</div>
    </div>
  );
}

/** 시각·계산 안내 문장. 사전에 문장 함수가 없으면(한국어) 계산 결과의 문장을 그대로 쓴다. */
function chartNotes(chart: SajuChart, t: Messages): string[] {
  const c = t.chart;
  const time = chart.time && c.timeNote ? c.timeNote(chart.time) : chart.timeNote;
  const notes = c.notice && chart.notices ? chart.notices.map(c.notice) : chart.warnings;
  return [...(time ? [time] : []), ...notes];
}

export function PillarsCard({ chart, locale }: { chart: SajuChart; locale?: Locale }) {
  const t = getMessages(locale);
  const c = t.chart;
  const { pillars } = chart;
  const notes = chartNotes(chart, t);
  const lunarText = c.lunarDate && chart.lunar ? c.lunarDate(chart.lunar) : chart.lunarDate;
  return (
    <section className="card">
      <h2>{c.pillarsTitle(chart.input.name)}</h2>
      <div className="pillars">
        <PillarColumn pillar={pillars.hour} label={c.pillarLabels.hour} t={t} />
        <PillarColumn pillar={pillars.day} label={c.pillarLabels.day} isDay t={t} />
        <PillarColumn pillar={pillars.month} label={c.pillarLabels.month} t={t} />
        <PillarColumn pillar={pillars.year} label={c.pillarLabels.year} t={t} />
      </div>
      <div className="facts">
        <span>{c.solar} <b>{chart.solarDate}</b></span>
        <span>{c.lunar} <b>{lunarText}</b></span>
        <span>{c.dayStem} <b>{locale && locale !== "ko" ? `${chart.dayMaster.stem} ${c.element[chart.dayMaster.element]}` : `${chart.dayMaster.stem}(${chart.dayMaster.ko}) ${c.element[chart.dayMaster.element]}`}</b></span>
        <span>{c.zodiacLabel} <b>{c.zodiac(chart.pillars.year.branch)}</b></span>
        <span>{c.strengthLabel} <b>{c.strength[chart.strength.label] ?? chart.strength.label}</b> {c.strengthRef(chart.strength.score)}</span>
      </div>
      {notes.length > 0 && (
        <ul className="notes">
          {notes.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </section>
  );
}

/** 오행 비중 도넛 차트. 조각 사이에 바탕색 간격을 두고, 색만으로 구분하지 않도록 범례에 이름과 값을 함께 적는다. */
function ElementDonut({ chart, t }: { chart: SajuChart; t: Messages }) {
  const c = t.chart;
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
      <svg viewBox="0 0 200 200" className="donut" role="img" aria-label={c.donutAria}>
        {slices.map((s) => (
          <path key={s.e} d={s.d} fill={`var(--el-${s.e})`} stroke="var(--surface)" strokeWidth={2} fillRule="evenodd">
            <title>{`${c.element[s.e]} ${s.pct}%`}</title>
          </path>
        ))}
        <text x="100" y="96" textAnchor="middle" className="donut-center">{dm.stem}</text>
        <text x="100" y="118" textAnchor="middle" className="donut-sub">{c.donutSub(dm.element)}</text>
      </svg>
      <ul className="legend">
        {ELEMENTS.map((e) => (
          <li key={e} style={elVar(e)}>
            <span className="swatch" aria-hidden />
            <span className="lname">{c.element[e]}</span>
            <span className="lval">{c.legend(Math.round((weighted[e] / total) * 100), chart.elements.counts[e])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ElementCard({ chart, locale }: { chart: SajuChart; locale?: Locale }) {
  const t = getMessages(locale);
  const c = t.chart;
  const missing = ELEMENTS.filter((e) => chart.elements.counts[e] === 0).map((e) => c.element[e]);
  return (
    <section className="card">
      <h2>{c.elementTitle}</h2>
      <ElementDonut chart={chart} t={t} />
      <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
        {c.elementNote}
        {missing.length > 0 && c.missing(missing.join(c.listSep))}
      </p>
    </section>
  );
}

export function AnalysisCard({ chart, locale }: { chart: SajuChart; locale?: Locale }) {
  const t = getMessages(locale);
  const c = t.chart;
  const a = chart.analysis;
  const u = a.usefulness;
  const g = a.gyeokguk;
  // 예전에 저장된 계산 결과에는 god·basis가 없을 수 있어, 없으면 계산 결과의 한국어 문장을 쓴다.
  const gName = g.god ? c.gyeokguk(g.god) : g.name;
  const gBasis = c.gyeokgukBasis && g.monthBranch ? c.gyeokgukBasis(g.monthBranch, g.stem, g.revealed) : g.basis;
  const method = c.method && u.basis ? c.method(u.basis) : u.method;
  return (
    <section className="card">
      <h2>{c.analysisTitle}</h2>
      <div className="kv">
        <div><span>{c.gyeokgukLabel}</span><b>{gName}</b><small>{gBasis}</small></div>
        <div style={elVar(u.yongsin)}><span>{c.yongsin}</span><b><i className="swatch" aria-hidden />{c.element[u.yongsin]}</b><small>{c.yongsinSub}</small></div>
        <div style={elVar(u.huisin)}><span>{c.huisin}</span><b><i className="swatch" aria-hidden />{c.element[u.huisin]}</b><small>{c.huisinSub}</small></div>
        <div style={elVar(u.gisin)}><span>{c.gisin}</span><b><i className="swatch" aria-hidden />{c.element[u.gisin]}</b><small>{c.gisinSub}</small></div>
      </div>
      <p className="muted" style={{ margin: "10px 0 0" }}>{method}. {c.schoolNote}</p>
      <h3>{c.tenGodTitle}</h3>
      <table className="table">
        <thead>
          <tr>{c.tenGodHead.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {a.tenGodGuide.map((row) => (
            <tr key={row.god}><td>{c.tenGod[row.god]}</td><td>{row.count}</td><td>{c.tenGodModern[row.god] ?? row.modern}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** 대운별 용신 부합도 곡선. 한 줄짜리 시계열이라 범례 없이 제목으로 설명한다. */
function DaeunCurve({ chart, t }: { chart: SajuChart; t: Messages }) {
  const c = t.chart;
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
    <svg viewBox={`0 0 ${W} ${H}`} className="curve" role="img" aria-label={c.curveAria}>
      {[0, 50, 100].map((g) => (
        <g key={g}>
          <line x1={left} x2={W - right} y1={y(g)} y2={y(g)} stroke="var(--grid)" strokeWidth={1} />
          <text x={left - 8} y={y(g) + 4} textAnchor="end" className="axis">{c.curveAxis[g]}</text>
        </g>
      ))}
      <path d={area} fill="var(--accent)" opacity={0.08} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
      {pts.map((p, i) => {
        const isCurrent = p.startYear === currentYear;
        return (
          <g key={p.startYear}>
            <circle cx={x(i)} cy={y(p.score)} r={isCurrent ? 7 : 5} fill={isCurrent ? "var(--accent)" : "var(--surface)"} stroke="var(--accent)" strokeWidth={2}>
              <title>{c.curvePoint(p.startAge, p.ganzhi, p.score)}</title>
            </circle>
            {(isCurrent || p.score === best) && (
              <text x={x(i)} y={y(p.score) - 12} textAnchor="middle" className="point-label">{isCurrent ? c.current : c.peak}</text>
            )}
            <text x={x(i)} y={top + plotH + 22} textAnchor="middle" className="axis strong">{c.age(p.startAge)}</text>
            <text x={x(i)} y={top + plotH + 40} textAnchor="middle" className="axis">{p.ganzhi}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function DaeunCard({ chart, locale }: { chart: SajuChart; locale?: Locale }) {
  const t = getMessages(locale);
  const c = t.chart;
  const { daeun } = chart;
  return (
    <section className="card">
      <h2>{c.daeunTitle} <span className="muted">{c.daeunSub(daeun.forward, daeun.startAge)}</span></h2>
      <DaeunCurve chart={chart} t={t} />
      <p className="muted" style={{ margin: "4px 0 12px" }}>{c.daeunNote(c.element[chart.analysis.usefulness.yongsin])}</p>
      <div className="daeun">
        {daeun.periods.map((p) => {
          const reading = c.luckReading(p.ko);
          return (
            <div key={p.startYear} className={`item${daeun.current?.startYear === p.startYear ? " current" : ""}`}>
              <div className="age">{c.age(p.startAge)}</div>
              <div className="gz">{p.stem}{p.branch}</div>
              {reading && <div>{reading}</div>}
              <div className="gods">{c.tenGod[p.stemTenGod]}·{c.tenGod[p.branchTenGod]}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const MARK_ICON = { 좋음: "●", 보통: "○", 주의: "▲" } as const;

export function YearFlowCard({ chart, locale }: { chart: SajuChart; locale?: Locale }) {
  const t = getMessages(locale);
  const c = t.chart;
  const a = chart.analysis;
  return (
    <section className="card">
      <h2>{c.yearFlowTitle(a.reportYears[0], a.reportYears[1])}</h2>
      <div className="year-scores">
        {a.yearScores.map((y) => (
          <div key={y.year}>
            <span>{c.year(y.year)}</span>
            <b>{y.ganzhi}</b>
            <small>{c.yearScore(y.score)}</small>
          </div>
        ))}
      </div>
      {a.reportYears.map((year) => (
        <div key={year} className="month-block">
          <h3>{c.monthTitle(year)}</h3>
          <table className="table months">
            <thead>
              <tr>{c.monthHead.map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {a.monthly
                .filter((m) => m.year === year)
                .map((m) => (
                  <tr key={m.startDate}>
                    <td>{Number(m.startDate.slice(5, 7))}/{Number(m.startDate.slice(8))}~</td>
                    <td>{m.stem}{m.branch}</td>
                    <td>{c.tenGod[m.stemTenGod]}·{c.tenGod[m.branchTenGod]}</td>
                    <td className={`mark ${m.mark}`}>{MARK_ICON[m.mark]} {c.mark[m.mark]}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="muted" style={{ margin: "8px 0 0" }}>{c.monthNote}</p>
    </section>
  );
}

export function LuckyCard({ chart, locale }: { chart: SajuChart; locale?: Locale }) {
  const t = getMessages(locale);
  const c = t.chart;
  const el = chart.analysis.lucky.element;
  const l = c.lucky[el];
  return (
    <section className="card lucky" style={elVar(el)}>
      <h2>{c.luckyTitle}</h2>
      <div className="kv">
        <div><span>{c.luckyElement}</span><b><i className="swatch" aria-hidden />{c.element[el]}</b></div>
        <div><span>{c.colors}</span><b>{l.colors}</b></div>
        <div><span>{c.numbers}</span><b>{l.numbers}</b></div>
        <div><span>{c.direction}</span><b>{l.direction}</b></div>
      </div>
      <p className="muted" style={{ margin: "10px 0 0" }}>{c.habits}: {l.habits}</p>
    </section>
  );
}
