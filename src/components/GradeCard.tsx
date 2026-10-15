import type { SajuChart } from "@/lib/saju/calc";
import { GRADE_TIERS, type GradeParts } from "@/lib/saju/grade";
import stats from "@/lib/saju/grade-stats.json";
import Seal from "./Seal";

const PART_LABELS: { key: keyof GradeParts; label: string; max: number }[] = [
  { key: "balance", label: "오행 균형", max: 30 },
  { key: "daeun", label: "대운의 도움", max: 30 },
  { key: "harmony", label: "신강·신약 중화", max: 15 },
  { key: "yongsin", label: "용신의 힘", max: 15 },
  { key: "noble", label: "귀인", max: 10 },
];

const fmt = (n: number) => n.toLocaleString("ko-KR");

/** 사주 등급·희소도 카드. 결과 맨 위(PDF는 표지 다음 쪽)에 놓는다. */
export default function GradeCard({ chart }: { chart: SajuChart }) {
  const g = chart.grade;
  return (
    <section className="card grade" aria-labelledby="grade-title">
      <h2 id="grade-title">내 사주 등급</h2>

      <div className="grade-hero">
        <Seal level={g.tier.level} size="lg" animate label={`${g.tier.level}등급`} />
        <div className="grade-text">
          <b>{g.tier.name}</b>
          <p>{g.tier.desc}</p>
          <p className="grade-top">
            상위 <strong>{g.topPercent}%</strong> · {g.score}점 / 100
          </p>
        </div>
      </div>

      <ol className="grade-ladder" aria-label="다섯 단계 등급">
        {GRADE_TIERS.map((t) => {
          const mine = t.level === g.tier.level;
          return (
            <li key={t.level} className={mine ? "mine" : undefined} aria-current={mine ? "true" : undefined}>
              <span className="lv">{t.level}등급</span>
              <span className="nm">{t.name}</span>
              <span className="sh">{mine ? "◀ 나" : `${t.share}%`}</span>
            </li>
          );
        })}
      </ol>

      <div className="kv grade-kv">
        <div>
          <span>나와 같은 사주 조합</span>
          <b>{g.rarity.oneIn >= 1000 ? `${fmt(Math.round(g.rarity.oneIn / 100) * 100)}명 중 1명` : `${fmt(g.rarity.oneIn)}명 중 1명`}</b>
          <small>{g.rarity.label}</small>
        </div>
        {g.peak && (
          <div>
            <span>대운 전성기</span>
            <b>
              {g.peak.startAge}~{g.peak.endAge}세
            </b>
            <small>
              {g.peak.ganzhi} 대운 · 용신 부합도 {g.peak.score}
            </small>
          </div>
        )}
        {g.nobles.map((n) => (
          <div key={n.name}>
            <span>{n.name}</span>
            <b>{n.has ? "있음" : "없음"}</b>
            <small>전체 사주의 {n.populationPercent}%가 가진 귀인</small>
          </div>
        ))}
      </div>

      <h3>등급 근거</h3>
      <div className="bars">
        {PART_LABELS.map(({ key, label, max }) => {
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
        {stats.range.replace("-", "~")}년에 태어날 수 있는 사주 {fmt(stats.total)}개(날짜 × 12시진 × 성별)를 모두 같은 기준으로 계산해 비교한
        상대 등급입니다. 오행 균형, 대운의 도움, 중화, 용신, 귀인을 점수화했으며 학파에 따라 판단이 다를 수 있어 참고용으로 제시합니다.
        {g.partial && " 태어난 시각을 몰라 시주를 뺀 6글자로 계산했습니다."}
      </p>
    </section>
  );
}
