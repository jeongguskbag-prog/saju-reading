"use client";
import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import type { ZiweiComputed, ZiweiPalace, ZiweiResult, ZiweiStar } from "@/lib/extras/ziwei";
import { Cover } from "../ReportView";
import { ExtraFooter, SectionsBody } from "./ExtraReport";

/** 전통 명반 배치: 위 巳午未申, 왼쪽 辰卯, 오른쪽 酉戌, 아래 寅丑子亥 */
const GRID: (string | null)[] = ["巳", "午", "未", "申", "辰", null, null, "酉", "卯", null, null, "戌", "寅", "丑", "子", "亥"];

const Star = ({ s, major }: { s: ZiweiStar; major?: boolean }) => (
  <span className={major ? "zw-major" : "zw-minor"}>
    {s.name}
    {s.bright && <small>{s.bright}</small>}
    {s.mutagen && <em className={`zw-mut m-${s.mutagen}`}>{s.mutagen.slice(1)}</em>}
  </span>
);

function Cell({ p, c }: { p: ZiweiPalace; c: ZiweiComputed }) {
  const cur = c.decadal?.palace === p.name;
  const yr = c.yearly.palace === p.name;
  return (
    <div className={`zw-cell${p.name === "명궁" ? " ming" : ""}${cur ? " dec" : ""}${cur || yr ? " flagged" : ""}`}>
      <div className="zw-stars">
        {p.major.length ? p.major.map((s) => <Star key={s.name} s={s} major />) : <span className="zw-empty">공궁</span>}
        {p.minor.map((s) => (
          <Star key={s.name} s={s} />
        ))}
      </div>
      <div className="zw-foot">
        <span className="zw-range">{p.decadal[0]}–{p.decadal[1]}</span>
        <b>
          {p.name}
          {p.body && <i>身</i>}
        </b>
        <span className="zw-gz">{p.stem}{p.branch}</span>
      </div>
      {(cur || yr) && <span className="zw-flag">{[cur && "대한", yr && "유년"].filter(Boolean).join("·")}</span>}
    </div>
  );
}

function Board({ c, name }: { c: ZiweiComputed; name: string }) {
  const by = new Map(c.palaces.map((p) => [p.branch, p]));
  let centerDone = false;
  return (
    <section className="card zw-board-card">
      <h2>명반(命盤)</h2>
      <div className="zw-board">
        {GRID.map((b, i) => {
          if (b) return <Cell key={b} p={by.get(b)!} c={c} />;
          if (centerDone) return null;
          centerDone = true;
          return (
            <div key="center" className="zw-center">
              <p className="zw-name">{name}</p>
              <p>양력 {c.solar} · {c.timeLabel}</p>
              <p>
                {c.fiveClass} · 명주 <b>{c.soul}</b> · 신주 <b>{c.body}</b>
              </p>
              <p className="muted small">
                {c.year}년 세는나이 {c.nominalAge}세 · {c.decadal ? `대한 ${c.decadal.palace}` : "첫 대한 전"} · 유년 {c.yearly.ganzhi}
              </p>
              <p className="muted small">사화: 록·권·과·기 · 밝기: 묘왕득리평불함</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Method() {
  return (
    <section className="card method">
      <h2>명반 기준 및 고지</h2>
      <ol>
        <li><b>명반:</b> 출생지 시각(진태양시 보정 반영)의 시진으로 공개 계산 라이브러리 iztro(MIT)를 써서 14주성·보좌성·살성, 밝기, 생년사화, 대한을 배치했습니다. 윤달은 15일을 기준으로 앞뒤 달에 나누어 봅니다.</li>
        <li><b>나이:</b> 대한과 유년은 자미두수 관례대로 세는나이로 봅니다.</li>
        <li><b>학파:</b> 자미두수는 학파마다 별 배치·사화 표가 조금씩 다를 수 있으며, 이 명반은 대만 전서파의 일반적인 기준을 따릅니다.</li>
        <li><b>고지:</b> 전통 술수에 바탕을 둔 참고 자료이며, 결과를 보장하지 않습니다.</li>
      </ol>
    </section>
  );
}

export default function ZiweiReport({ chart, data, pending, notice, title }: { chart: SajuChart; data: ZiweiResult | null; pending: ReactNode; notice?: ReactNode; title: string }) {
  const c = data?.computed;
  return (
    <div className="report extra ziwei">
      <Cover chart={chart} intro={null} title={title} years={c ? `${c.fiveClass} · 명주 ${c.soul}` : null} tagline={["열두 궁에 놓인 별로", "한 사람의 하늘을 읽다"]} />
      {notice}
      {c && data ? (
        <>
          <section className="part extra-part">
            <header className="part-head">
              <span>紫</span>
              <h2>나의 명반</h2>
              <p>{data.text.summary}</p>
            </header>
            <Board c={c} name={chart.input.name?.trim() || "의뢰인"} />
            {c.natalMutagens.length > 0 && (
              <section className="card">
                <h2>생년사화</h2>
                <div className="kv">
                  {c.natalMutagens.map((m) => (
                    <div key={m.mutagen}>
                      <span>{m.mutagen}</span>
                      <b>{m.star}</b>
                      <small>{m.palace}</small>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>
          <SectionsBody text={data.text} adviceTitle="명반에 맞춘 실천" />
          <Method />
        </>
      ) : (
        pending
      )}
      <ExtraFooter chart={chart} />
    </div>
  );
}
