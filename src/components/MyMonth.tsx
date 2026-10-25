import type { SajuChart } from "@/lib/saju/calc";
import { CALENDAR_PURPOSES, monthCalendar, monthFortune } from "@/lib/saju/monthly-fortune";
import type { TaekilPurpose } from "@/lib/extras/requests";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
const shift = (y: number, m: number, by: number) => {
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
};

/** 마이: 이달의 운세 + 길일 달력(서버에서 계산, 링크·폼으로 달과 목적을 바꾼다) */
export default function MyMonth({ chart, name, year, month, purpose, today }: { chart: SajuChart; name: string; year: number; month: number; purpose: TaekilPurpose | null; today: string }) {
  const f = monthFortune(chart, year, month);
  const cal = monthCalendar(chart, year, month, purpose);
  const prev = shift(year, month, -1);
  const next = shift(year, month, 1);
  const q = (y: number, m: number) => `/my?cal=${ym(y, m)}${purpose ? `&purpose=${purpose}` : ""}#month-h`;
  const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (typeof cal.days[number] | null)[] = [...Array(lead).fill(null), ...cal.days];
  const picks = cal.days.filter((d) => d.pick);
  return (
    <section className="card my-month" aria-labelledby="month-h">
      <div className="my-month-nav">
        <a href={q(prev.y, prev.m)} aria-label="지난달">
          ‹
        </a>
        <h2 id="month-h">
          {year}년 {month}월의 운세
        </h2>
        <a href={q(next.y, next.m)} aria-label="다음 달">
          ›
        </a>
      </div>
      <p className="muted">
        {f.ganzhi}({f.reading})월 · {name} 사주 기준
      </p>
      <p className="my-fortune-title">
        <span className={`mark mark-${f.mark}`}>{f.mark}</span> {f.title}
      </p>
      <p>{f.text}</p>
      <p>{f.tone}</p>

      <h3 className="my-month-cal-h">{cal.purposeLabel ? `${cal.purposeLabel} 길일 달력` : "길일 달력"}</h3>
      <form className="my-month-purpose" method="get" action="/my#month-h">
        <input type="hidden" name="cal" value={ym(year, month)} />
        <select name="purpose" defaultValue={purpose ?? ""} aria-label="목적">
          <option value="">하루 운의 흐름만 보기</option>
          {Object.entries(CALENDAR_PURPOSES).map(([k, v]) => (
            <option key={k} value={k}>
              {v} 길일 찾기
            </option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">
          보기
        </button>
      </form>
      <div className="my-cal" role="grid" aria-label={`${year}년 ${month}월 길일 달력`}>
        {WD.map((w, i) => (
          <div key={w} className={`my-cal-wd ${i === 0 ? "sun" : i === 6 ? "sat" : ""}`} role="columnheader">
            {w}
          </div>
        ))}
        {cells.map((d, i) =>
          d ? (
            <div
              key={d.date}
              role="gridcell"
              className={`my-cal-day cal-${d.mark}${d.pick ? " cal-pick" : ""}${d.avoid ? " cal-avoid" : ""}${d.date === today ? " cal-today" : ""}`}
              title={`${d.date} ${d.ganzhi}일 · ${d.mark}${d.pick ? " · 길일" : ""}${d.avoid ? ` · 피할 날(${d.avoid})` : ""}`}
            >
              <b>{d.day}</b>
              <small>{d.pick ? "★길일" : d.avoid ? "피함" : d.mark}</small>
            </div>
          ) : (
            <div key={`e${i}`} className="my-cal-empty" />
          ),
        )}
      </div>
      <p className="muted small">
        {purpose
          ? picks.length
            ? `${cal.purposeLabel}에 좋은 날: ${picks.map((d) => `${d.day}일(${WD[d.weekday]})`).join(", ")}. 내 사주와의 합충, 용신, 역서의 마땅한 일(宜)·꺼리는 일(忌), 건제 12직을 함께 따졌습니다.`
            : `이달에는 ${cal.purposeLabel}에 특히 좋은 날이 적습니다. 다음 달도 확인해 보세요.`
          : "날마다 그날 일진이 내 사주의 균형을 돕는지(용신)와 내 일지와의 합·충으로 정한 참고용 표시입니다. 목적을 고르면 그 일에 맞는 길일을 찾아 드립니다."}{" "}
        더 자세한 날짜 풀이는 <a href="/?p=taekil#saju-form">택일록</a>에서 받아 보실 수 있습니다.
      </p>
    </section>
  );
}
