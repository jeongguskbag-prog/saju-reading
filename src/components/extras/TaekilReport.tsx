"use client";
import type { ReactNode } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import type { TaekilResult, TaekilDay } from "@/lib/extras/taekil";
import { ALMANAC_KO } from "@/lib/extras/almanac";
import { TAEKIL_PURPOSES } from "@/lib/extras/requests";
import { Cover } from "../ReportView";
import { PillarsCard } from "../ChartView";
import { ExtraFooter, SectionsBody } from "./ExtraReport";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const ZX: Record<string, string> = { 建: "건", 除: "제", 满: "만", 平: "평", 定: "정", 执: "집", 破: "파", 危: "위", 成: "성", 收: "수", 开: "개", 闭: "폐" };
const dateKo = (d: TaekilDay) => `${+d.date.slice(5, 7)}월 ${+d.date.slice(8, 10)}일(${WD[d.weekday]})`;
const yiKo = (xs: string[]) => xs.map((x) => ALMANAC_KO[x]).filter(Boolean).slice(0, 6).join(", ");

function PickCard({ d, rank, purpose }: { d: TaekilDay; rank: number; purpose: string }) {
  return (
    <section className="card tk-pick">
      <div className="ny-month-head">
        <h3>
          <span className="tk-rank">{rank}</span> {d.date.slice(0, 4)}년 {dateKo(d)} <span>{d.ganzhi}</span>
        </h3>
        <span className="gh-mini-row">
          <i className="gh-mini" aria-hidden>
            <em style={{ width: `${d.score}%` }} />
          </i>
          <b>{d.score}</b>
        </span>
      </div>
      <p className="muted small">
        {d.lunar} · {d.huangdao ? "황도일" : "흑도일"} · 12직 {ZX[d.zhixing] ?? d.zhixing}일 · 용신 부합 {d.yongsin}
        {d.sonEomneun ? " · 손 없는 날" : ""}
        {d.withDay.map((r) => (
          <span key={r.name} className={`gh-rel t${r.tone + 1}`}>
            일지 {r.name}
          </span>
        ))}
      </p>
      {d.fits && <p className="small tk-fit">✓ 전통 역서에서 {purpose}에 마땅한 날로 꼽는 날입니다.</p>}
      {yiKo(d.yi) && <p className="small">역서의 마땅한 일: {yiKo(d.yi)}</p>}
    </section>
  );
}

function Calendar({ days, picks }: { days: TaekilDay[]; picks: string[] }) {
  return (
    <section className="card">
      <h2>기간 전체 일진표</h2>
      <p className="muted small">◎ 추천일 · ○ 무난 · × 피한 날(이유 표시)</p>
      <table className="table tk-cal">
        <thead>
          <tr>
            <th>날짜</th>
            <th>일진</th>
            <th>점수</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date} className={picks.includes(d.date) ? "pick" : d.excluded ? "ex" : undefined}>
              <td>
                {picks.includes(d.date) ? "◎" : d.excluded ? "×" : "○"} {dateKo(d)}
              </td>
              <td>{d.ganzhi}</td>
              <td>{d.excluded ? "-" : d.score}</td>
              <td className="small">{d.excluded ?? `${d.huangdao ? "황도" : "흑도"} · ${ZX[d.zhixing] ?? d.zhixing}일${d.fits ? " · 목적에 맞음" : ""}`}</td>
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
      <h2>택일 기준 및 고지</h2>
      <ol>
        <li><b>일진:</b> 기간의 날마다 간지(일진)를 세워 의뢰인의 일간·일지·띠와의 합충, 참고 용신에 맞는 정도를 보았습니다. 일진이 의뢰인의 일지와 충하는 날은 뺐습니다.</li>
        <li><b>역법:</b> 황도·흑도(그날의 12신), 건제 12직, 전통 역서의 마땅한 일(宜)·꺼리는 일(忌)을 반영했습니다. 고르신 일을 역서가 꺼리는 날과 파일(破日)은 뺐습니다. 이사는 손 없는 날(음력 9·10일로 끝나는 날)을 더 쳐 주었습니다.</li>
        <li><b>점수:</b> 용신 부합 40%에 역서·황도·12직·합충을 더하고 뺀 참고 지표입니다.</li>
        <li><b>고지:</b> 전통 택일법에 바탕을 둔 참고 자료입니다. 실제 날짜는 참석자 일정·장소·비용 같은 현실 조건과 함께 정하세요.</li>
      </ol>
    </section>
  );
}

export default function TaekilReport({ chart, data, pending, notice, title }: { chart: SajuChart; data: TaekilResult | null; pending: ReactNode; notice?: ReactNode; title: string }) {
  const c = data?.computed;
  const picks = c ? c.days.filter((d) => c.picks.includes(d.date)).sort((a, b) => b.score - a.score) : [];
  return (
    <div className="report extra taekil">
      <Cover
        chart={chart}
        intro={null}
        title={title}
        years={c ? `${c.start.replaceAll("-", ".")} – ${c.end.replaceAll("-", ".")}` : null}
        tagline={["날의 간지와 내 사주를 맞춰", "큰일의 날을 고르다"]}
        extra={c ? <p className="cover-keywords">{TAEKIL_PURPOSES[c.purpose]} 택일</p> : null}
      />
      {notice}
      {c && data ? (
        <>
          <section className="part extra-part">
            <header className="part-head">
              <span>序</span>
              <h2>{TAEKIL_PURPOSES[c.purpose]} 택일</h2>
              <p>{data.text.summary}</p>
            </header>
            <PillarsCard chart={chart} />
            <section className="part extra-part">
              <header className="part-head">
                <span>吉</span>
                <h2>추천일 {picks.length}선</h2>
                <p>
                  {c.start} ~ {c.end}
                  {c.weekendsOnly ? " 주말" : ""} {c.days.length}일 가운데 고른 날입니다(점수 순).
                </p>
              </header>
              {picks.map((d, i) => (
                <PickCard key={d.date} d={d} rank={i + 1} purpose={TAEKIL_PURPOSES[c.purpose]} />
              ))}
            </section>
          </section>
          <SectionsBody text={data.text} adviceTitle="그날을 잘 쓰는 법" />
          <Calendar days={c.days} picks={c.picks} />
          <Method />
        </>
      ) : (
        pending
      )}
      <ExtraFooter chart={chart} />
    </div>
  );
}
