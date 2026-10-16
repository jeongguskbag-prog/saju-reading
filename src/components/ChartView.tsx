import type { CSSProperties } from "react";
import type { Pillar, SajuChart } from "@/lib/saju/calc";
import { ELEMENTS, type Element } from "@/lib/saju/constants";
import { useT } from "./LocaleProvider";

const elVar = (e: Element) => ({ "--el": `var(--el-${e})` }) as CSSProperties;

function PillarColumn({ pillar, label, isDay }: { pillar: Pillar | null; label: string; isDay?: boolean }) {
  const t = useT();
  if (!pillar) {
    return (
      <div className="pillar" style={{ display: "grid", gap: 4 }}>
        <div className="head">{label}</div>
        <div className="god" />
        <div className="glyph empty"><div className="hanja">?</div><div className="ko">{t.unknown}</div></div>
        <div className="glyph empty"><div className="hanja">?</div><div className="ko">{t.unknown}</div></div>
        <div className="god" />
      </div>
    );
  }
  return (
    <div className="pillar" style={{ display: "grid", gap: 4 }}>
      <div className="head">{label}</div>
      <div className="god">{pillar.stemTenGod ? t.god(pillar.stemTenGod) : t.dayMasterSelf}</div>
      <div className={`glyph${isDay ? " day" : ""}`} style={elVar(pillar.stemElement)} title={t.el(pillar.stemElement)}>
        <div className="hanja">{pillar.stem}</div>
        <div className="ko">{t.glyphSub(pillar.stemKo, pillar.stemElement)}</div>
      </div>
      <div className="glyph" style={elVar(pillar.branchElement)} title={t.el(pillar.branchElement)}>
        <div className="hanja">{pillar.branch}</div>
        <div className="ko">{t.glyphSub(pillar.branchKo, pillar.branchElement)}</div>
      </div>
      <div className="god">{t.god(pillar.branchTenGod)}</div>
      <div className="hidden-stems" title={t.hiddenStems}>{pillar.hiddenStems.map((h) => h.stem).join(" ")}</div>
    </div>
  );
}

export function PillarsCard({ chart }: { chart: SajuChart }) {
  const t = useT();
  const { pillars } = chart;
  return (
    <section className="card">
      <h2>{t.chartTitle(chart.input.name)}</h2>
      <div className="pillars">
        <PillarColumn pillar={pillars.hour} label={t.pillarHour} />
        <PillarColumn pillar={pillars.day} label={t.pillarDay} isDay />
        <PillarColumn pillar={pillars.month} label={t.pillarMonth} />
        <PillarColumn pillar={pillars.year} label={t.pillarYear} />
      </div>
      <div className="facts">
        <span>{t.factSolar} <b>{chart.solarDate}</b></span>
        <span>{t.factLunar} <b>{chart.lunarDate}</b></span>
        <span>{t.factDayMaster} <b>{t.ganzhiReading(chart.dayMaster.ko) === null ? chart.dayMaster.stem : `${chart.dayMaster.stem}(${chart.dayMaster.ko})`} {t.el(chart.dayMaster.element)}</b></span>
        <span>{t.factZodiac} <b>{chart.zodiac}</b></span>
        <span>{t.factStrength} <b>{chart.strength.label}</b> {t.factStrengthScore(chart.strength.score)}</span>
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
  const t = useT();
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
      <svg viewBox="0 0 200 200" className="donut" role="img" aria-label={t.donutAria}>
        {slices.map((s) => (
          <path key={s.e} d={s.d} fill={`var(--el-${s.e})`} stroke="var(--surface)" strokeWidth={2} fillRule="evenodd">
            <title>{`${t.el(s.e)} ${s.pct}%`}</title>
          </path>
        ))}
        <text x="100" y="96" textAnchor="middle" className="donut-center">{dm.stem}</text>
        <text x="100" y="118" textAnchor="middle" className="donut-sub">{t.donutCenter(t.elShort(dm.element))}</text>
      </svg>
      <ul className="legend">
        {ELEMENTS.map((e) => (
          <li key={e} style={elVar(e)}>
            <span className="swatch" aria-hidden />
            <span className="lname">{t.el(e)}</span>
            <span className="lval">
              {t.legendValue(Math.round((weighted[e] / total) * 100), chart.elements.counts[e])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ElementCard({ chart }: { chart: SajuChart }) {
  const t = useT();
  const missing = ELEMENTS.filter((e) => chart.elements.counts[e] === 0).map((e) => t.el(e));
  return (
    <section className="card">
      <h2>{t.elementTitle}</h2>
      <ElementDonut chart={chart} />
      <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
        {t.elementNote}
        {missing.length > 0 && t.elementMissing(missing)}
      </p>
    </section>
  );
}

export function AnalysisCard({ chart }: { chart: SajuChart }) {
  const t = useT();
  const a = chart.analysis;
  const u = a.usefulness;
  return (
    <section className="card">
      <h2>{t.analysisTitle}</h2>
      <div className="kv">
        <div><span>{t.gyeokguk}</span><b>{a.gyeokguk.label ?? a.gyeokguk.name}</b><small>{a.gyeokguk.basis}</small></div>
        <div style={elVar(u.yongsin)}><span>{t.yongsin}</span><b><i className="swatch" aria-hidden />{t.el(u.yongsin)}</b><small>{t.yongsinDesc}</small></div>
        <div style={elVar(u.huisin)}><span>{t.huisin}</span><b><i className="swatch" aria-hidden />{t.el(u.huisin)}</b><small>{t.huisinDesc}</small></div>
        <div style={elVar(u.gisin)}><span>{t.gisin}</span><b><i className="swatch" aria-hidden />{t.el(u.gisin)}</b><small>{t.gisinDesc}</small></div>
      </div>
      <p className="muted" style={{ margin: "10px 0 0" }}>{t.methodNote(u.method)}</p>
      <h3>{t.tenGodTitle}</h3>
      <table className="table">
        <thead>
          <tr><th>{t.tenGodHead[0]}</th><th>{t.tenGodHead[1]}</th><th>{t.tenGodHead[2]}</th></tr>
        </thead>
        <tbody>
          {a.tenGodGuide.map((g) => (
            <tr key={g.god}><td>{t.god(g.god)}</td><td>{g.count}</td><td>{g.modern}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** 대운별 용신 부합도 곡선. 한 줄짜리 시계열이라 범례 없이 제목으로 설명한다. */
function DaeunCurve({ chart }: { chart: SajuChart }) {
  const t = useT();
  const pts = chart.analysis.daeunScores;
  if (pts.length === 0) return null;
  const W = 640;
  const H = 258;
  const left = 56;
  const right = 20;
  const top = 46;
  const plotH = 140;
  const step = pts.length > 1 ? (W - left - right) / (pts.length - 1) : 0;
  const x = (i: number) => left + i * step;
  const y = (s: number) => top + (1 - s / 100) * plotH;
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.score)}`).join(" ");
  const area = `${line} L ${x(pts.length - 1)} ${top + plotH} L ${x(0)} ${top + plotH} Z`;
  const currentYear = chart.daeun.current?.startYear;
  const best = Math.max(...pts.map((p) => p.score));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="curve" role="img" aria-label={t.curveAria}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line
            x1={left}
            x2={W - right}
            y1={y(g)}
            y2={y(g)}
            stroke="var(--grid)"
            strokeWidth={g === 50 ? 1.5 : 1}
            strokeDasharray={g === 0 || g === 100 ? undefined : "4 4"}
          />
          {g % 50 === 0 && (
            <text x={left - 8} y={y(g) + 4} textAnchor="end" className="axis">{t.curveAxis(g)}</text>
          )}
        </g>
      ))}
      <path d={area} fill="var(--accent)" opacity={0.1} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => {
        const isCurrent = p.startYear === currentYear;
        const isBest = p.score === best;
        const cx = x(i);
        const cy = y(p.score);
        return (
          <g key={p.startYear}>
            {isCurrent && (
              // 현재 대운: 세로 점선과 위치 핀
              <g className="curve-pin">
                <line x1={cx} x2={cx} y1={cy} y2={top + plotH} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="3 3" />
                <path
                  d={`M ${cx} ${cy - 10} C ${cx - 9} ${cy - 22}, ${cx - 9} ${cy - 34}, ${cx} ${cy - 34} C ${cx + 9} ${cy - 34}, ${cx + 9} ${cy - 22}, ${cx} ${cy - 10} Z`}
                  fill="var(--accent)"
                />
                <circle cx={cx} cy={cy - 26} r={3.2} fill="var(--surface)" />
              </g>
            )}
            <circle cx={cx} cy={cy} r={isCurrent ? 7 : 5.5} fill={isCurrent ? "var(--accent)" : "var(--surface)"} stroke="var(--accent)" strokeWidth={2.5}>
              <title>{t.curvePointTitle(p.startAge, p.ganzhi, p.score)}</title>
            </circle>
            {(isCurrent || isBest) && (
              // 양 끝 점의 이름표는 축 글씨·그림 밖으로 나가지 않게 안쪽으로 붙인다.
              <text
                x={cx}
                y={isCurrent ? cy - 40 : cy - 12}
                textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"}
                className="point-label"
              >
                {isCurrent ? (isBest ? `${t.curveCurrent} · ${t.curvePeak}` : t.curveCurrent) : t.curvePeak}
              </text>
            )}
            <text x={x(i)} y={top + plotH + 22} textAnchor="middle" className="axis strong">{t.age(p.startAge)}</text>
            <text x={x(i)} y={top + plotH + 40} textAnchor="middle" className="axis">{p.ganzhi}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function DaeunCard({ chart }: { chart: SajuChart }) {
  const t = useT();
  const { daeun } = chart;
  return (
    <section className="card">
      <h2>{t.daeunTitle} <span className="muted">{t.daeunSub(daeun.forward, daeun.startAge)}</span></h2>
      <DaeunCurve chart={chart} />
      <p className="muted" style={{ margin: "4px 0 12px" }}>
        {t.daeunNote(t.el(chart.analysis.usefulness.yongsin))}
      </p>
      <div className="daeun">
        {daeun.periods.map((p) => (
          <div key={p.startYear} className={`item${daeun.current?.startYear === p.startYear ? " current" : ""}`}>
            <div className="age">{t.age(p.startAge)}</div>
            <div className="gz">{p.stem}{p.branch}</div>
            {t.ganzhiReading(p.ko) !== null && <div>{p.ko}</div>}
            <div className="gods">{t.god(p.stemTenGod)}·{t.god(p.branchTenGod)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const MARK_ICON = { 좋음: "●", 보통: "○", 주의: "▲" } as const;

export function YearFlowCard({ chart }: { chart: SajuChart }) {
  const t = useT();
  const a = chart.analysis;
  return (
    // 두 해의 월별 표가 한 쪽보다 길어, PDF에서는 표 단위로 쪽을 나눈다(통째로 넘기면 앞쪽이 비어 버린다).
    <section className="card yearflow">
      <h2>{t.yearFlowTitle(a.reportYears[0], a.reportYears[1])}</h2>
      <div className="year-scores">
        {a.yearScores.map((y) => (
          <div key={y.year}>
            <span>{t.yearLabel(y.year)}</span>
            <b>{y.ganzhi}</b>
            <small>{t.yongsinFit(y.score)}</small>
          </div>
        ))}
      </div>
      {a.reportYears.map((year) => (
        <div key={year} className="month-block">
          <h3>{t.monthlyTitle(year)}</h3>
          <table className="table months">
            <thead>
              <tr><th>{t.monthHead[0]}</th><th>{t.monthHead[1]}</th><th>{t.monthHead[2]}</th><th>{t.monthHead[3]}</th></tr>
            </thead>
            <tbody>
              {a.monthly
                .filter((m) => m.year === year)
                .map((m) => (
                  <tr key={m.startDate}>
                    <td>{Number(m.startDate.slice(5, 7))}/{Number(m.startDate.slice(8))}~</td>
                    <td>{m.stem}{m.branch}</td>
                    <td>{t.god(m.stemTenGod)}·{t.god(m.branchTenGod)}</td>
                    <td className={`mark ${m.mark}`}>{MARK_ICON[m.mark]} {t.mark(m.mark)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
      <p className="muted" style={{ margin: "8px 0 0" }}>{t.monthNote}</p>
    </section>
  );
}

export function LuckyCard({ chart }: { chart: SajuChart }) {
  const t = useT();
  const l = chart.analysis.lucky;
  return (
    <section className="card lucky" style={elVar(l.element)}>
      <h2>{t.luckyTitle}</h2>
      <div className="kv">
        <div><span>{t.luckyElement}</span><b><i className="swatch" aria-hidden />{t.el(l.element)}</b></div>
        <div><span>{t.luckyColors}</span><b>{l.colors}</b></div>
        <div><span>{t.luckyNumbers}</span><b>{l.numbers}</b></div>
        <div><span>{t.luckyDirection}</span><b>{l.direction}</b></div>
      </div>
      <p className="muted" style={{ margin: "10px 0 0" }}>{t.luckyHabits(l.habits)}</p>
    </section>
  );
}
