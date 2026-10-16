import type { SajuChart } from "@/lib/saju/calc";
import { gradeTiers, type GradeParts } from "@/lib/saju/grade";
import stats from "@/lib/saju/grade-stats.json";
import Seal from "./Seal";
import { useLocale, useT } from "./LocaleProvider";

const PART_MAX: { key: keyof GradeParts; max: number }[] = [
  { key: "balance", max: 30 },
  { key: "daeun", max: 30 },
  { key: "harmony", max: 15 },
  { key: "yongsin", max: 15 },
  { key: "noble", max: 10 },
];

/** 사주 등급·희소도 카드. 결과 맨 위(PDF는 표지 다음 쪽)에 놓는다. */
export default function GradeCard({ chart }: { chart: SajuChart }) {
  const g = chart.grade;
  const t = useT();
  const locale = useLocale();
  const fmt = (n: number) => n.toLocaleString(t.numberLocale);
  const tier = gradeTiers(locale).find((x) => x.level === g.tier.level) ?? g.tier;
  // 상위권(상위 50% 안)일 때만 순위를 보여 주고, 그 밖에는 유형의 비율로 소개한다.
  const ranked = g.topPercent <= 50;
  return (
    <section className="card grade" aria-labelledby="grade-title">
      <h2 id="grade-title">{t.gradeTitle}</h2>

      <div className="grade-hero">
        <Seal level={g.tier.level} size="lg" animate label={tier.type} />
        <div className="grade-text">
          <b>{tier.type}</b>
          <p className="grade-name">{tier.name}</p>
          <p>{tier.desc}</p>
          <p className="grade-top">
            {ranked ? (
              <>
                {t.gradeTop} <strong>{g.topPercent}%</strong>
              </>
            ) : (
              t.gradeTypeShare(tier.share)
            )}{" "}
            · {t.gradeScore(g.score)}
          </p>
        </div>
      </div>

      <ol className="grade-ladder" aria-label={t.gradeLadderAria}>
        {gradeTiers(locale).map((tt) => {
          const mine = tt.level === g.tier.level;
          return (
            <li key={tt.level} className={mine ? "mine" : undefined} aria-current={mine ? "true" : undefined}>
              <span className="lv">{tt.type.replace(/\(.*\)$/, "")}</span>
              <span className="nm">{tt.name}</span>
              <span className="sh">{mine ? t.gradeMine : `${tt.share}%`}</span>
            </li>
          );
        })}
      </ol>

      <div className="kv grade-kv">
        <div>
          <span>{t.sameCombo}</span>
          <b>{t.oneIn(fmt(g.rarity.oneIn >= 1000 ? Math.round(g.rarity.oneIn / 100) * 100 : g.rarity.oneIn))}</b>
          <small>{g.rarity.label}</small>
        </div>
        {g.peak && (
          <div>
            <span>{t.peakTitle}</span>
            <b>{t.peakAges(g.peak.startAge, g.peak.endAge)}</b>
            <small>{t.peakSub(g.peak.ganzhi, g.peak.score)}</small>
          </div>
        )}
        {g.nobles.map((n) => (
          <div key={n.name}>
            <span>{t.noble(n.name)}</span>
            <b>{t.has(n.has)}</b>
            <small>{t.noblePopulation(n.populationPercent)}</small>
          </div>
        ))}
      </div>

      <h3>{t.gradeBasis}</h3>
      <div className="bars">
        {PART_MAX.map(({ key, max }) => {
          const label = t.gradeParts[key];
          const v = g.parts[key];
          return (
            <div className="bar-row" key={key}>
              <span className="name">{label}</span>
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
        {t.gradeNote(stats.range.replace("-", "~"), fmt(stats.total))}
        {g.partial && t.gradePartial}
      </p>
    </section>
  );
}
