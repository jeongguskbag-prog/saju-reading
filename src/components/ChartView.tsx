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

function ElementBars({ chart }: { chart: SajuChart }) {
  const { counts, weighted } = chart.elements;
  const max = Math.max(4, ...ELEMENTS.map((e) => counts[e]));
  return (
    <div className="bars" role="list">
      {ELEMENTS.map((e) => (
        <div
          key={e}
          className="bar-row"
          role="listitem"
          tabIndex={0}
          aria-label={`${ELEMENT_KO[e]} ${counts[e]}개, 지장간 포함 ${weighted[e]}`}
          style={elVar(e)}
        >
          <span className="name"><span className="swatch" aria-hidden />{ELEMENT_KO[e]}</span>
          <span className="track"><span className="fill" style={{ display: "block", width: `${(counts[e] / max) * 100}%` }} /></span>
          <span className="val">{counts[e]}개 · {weighted[e]}</span>
          <span className="tip" aria-hidden>{ELEMENT_KO[e]}: 글자 {counts[e]}개, 지장간 포함 {weighted[e]}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChartView({ chart }: { chart: SajuChart }) {
  const { pillars, daeun } = chart;
  const missing = ELEMENTS.filter((e) => chart.elements.counts[e] === 0).map((e) => ELEMENT_KO[e]);
  return (
    <>
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

      <section className="card">
        <h2>오행 분포</h2>
        <ElementBars chart={chart} />
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          막대는 드러난 글자 수, 오른쪽 숫자는 지장간까지 나눠 더한 점수입니다.
          {missing.length > 0 && ` 없는 오행: ${missing.join(", ")}.`}
        </p>
      </section>

      <section className="card">
        <h2>대운 <span className="muted">({daeun.forward ? "순행" : "역행"}, {daeun.startAge}세 시작)</span></h2>
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
        <p className="muted" style={{ margin: "8px 0 0" }}>
          {chart.yearLuck.year}년 세운: <b>{chart.yearLuck.stem}{chart.yearLuck.branch}({chart.yearLuck.ko})</b> · {chart.yearLuck.stemTenGod}·{chart.yearLuck.branchTenGod}
        </p>
      </section>
    </>
  );
}
