import type { SajuChart } from "@/lib/saju/calc";
import { GRADE_TIERS, type GradeParts } from "@/lib/saju/grade";
import stats from "@/lib/saju/grade-stats.json";
import { getMessages, type Locale } from "@/lib/i18n";
import Seal from "./Seal";

const PART_KEYS: { key: keyof GradeParts; max: number }[] = [
  { key: "balance", max: 30 },
  { key: "daeun", max: 30 },
  { key: "harmony", max: 15 },
  { key: "yongsin", max: 15 },
  { key: "noble", max: 10 },
];

/** 사주 등급·희소도 카드. 결과 맨 위(PDF는 표지 다음 쪽)에 놓는다. */
export default function GradeCard({ chart, locale }: { chart: SajuChart; locale?: Locale }) {
  const t = getMessages(locale);
  const m = t.grade;
  const fmt = (n: number) => n.toLocaleString(t.numberLocale);
  const g = chart.grade;
  const [from, to] = stats.range.split("-");
  const tier = m.tiers[g.tier.level] ?? g.tier;
  const a = chart.analysis;
  const rarity =
    m.rarityLabel && a.gyeokguk.god
      ? m.rarityLabel(`${chart.pillars.day.stem}${chart.pillars.day.branch}`, t.chart.gyeokguk(a.gyeokguk.god), t.chart.elementShort(a.usefulness.yongsin))
      : g.rarity.label;
  return (
    <section className="card grade" aria-labelledby="grade-title">
      <h2 id="grade-title">{m.title}</h2>

      <div className="grade-hero">
        <Seal level={g.tier.level} size="lg" animate label={m.seal(g.tier.level)} />
        <div className="grade-text">
          <b>{tier.name}</b>
          <p>{tier.desc}</p>
          <p className="grade-top">
            {m.top} <strong>{g.topPercent}%</strong> · {m.points(g.score)}
          </p>
        </div>
      </div>

      <ol className="grade-ladder" aria-label={m.ladderAria}>
        {GRADE_TIERS.map((tt) => {
          const mine = tt.level === g.tier.level;
          return (
            <li key={tt.level} className={mine ? "mine" : undefined} aria-current={mine ? "true" : undefined}>
              <span className="lv">{m.level(tt.level)}</span>
              <span className="nm">{(m.tiers[tt.level] ?? tt).name}</span>
              <span className="sh">{mine ? m.me : `${tt.share}%`}</span>
            </li>
          );
        })}
      </ol>

      <div className="kv grade-kv">
        <div>
          <span>{m.sameCombo}</span>
          <b>{m.oneIn(g.rarity.oneIn >= 1000 ? fmt(Math.round(g.rarity.oneIn / 100) * 100) : fmt(g.rarity.oneIn))}</b>
          <small>{rarity}</small>
        </div>
        {g.peak && (
          <div>
            <span>{m.peak}</span>
            <b>{m.ageRange(g.peak.startAge, g.peak.endAge)}</b>
            <small>{m.peakSub(g.peak.ganzhi, g.peak.score)}</small>
          </div>
        )}
        {g.nobles.map((n) => (
          <div key={n.name}>
            <span>{m.nobles[n.name] ?? n.name}</span>
            <b>{n.has ? m.has : m.none}</b>
            <small>{m.nobleShare(n.populationPercent)}</small>
          </div>
        ))}
      </div>

      <h3>{m.basisTitle}</h3>
      <div className="bars">
        {PART_KEYS.map(({ key, max }) => {
          const v = g.parts[key];
          return (
            <div className="bar-row" key={key}>
              <span className="name">{m.parts[key]}</span>
              <div className="track" aria-hidden>
                <div className="fill grade-fill" style={{ width: `${(v / max) * 100}%` }} />
              </div>
              <span className="val">
                {v} / {max}
              </span>
            </div>
          );
        })}
      </div>

      <p className="muted" style={{ margin: "12px 0 0" }}>
        {m.footnote(from, to, fmt(stats.total))}
        {g.partial && m.partial}
      </p>
    </section>
  );
}
