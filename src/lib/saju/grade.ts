// 사주 등급과 희소도. 원국과 대운만으로 결정적으로 점수를 매기고,
// 1960~2009년에 태어날 수 있는 모든 사주(날짜 × 12시진 × 성별)의 점수 분포(grade-stats.json)에서
// 내 점수가 어디쯤인지로 다섯 단계 등급을 정한다. 통계는 `npm run build:grade-stats`로 다시 만든다.
import { ELEMENTS, HIDDEN_STEMS, STEM_ELEMENT, type Branch, type Element, type Stem } from "./constants";
import type { Analysis } from "./analysis";
import type { Pillar } from "./calc";
import stats from "./grade-stats.json";
import { engineText, type Locale } from "./locale";

/** 천을귀인: 일간 기준으로 지지에 이 글자가 있으면 귀인이 있다. */
const CHEONEUL: Record<Stem, Branch[]> = {
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"],
  乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"],
  辛: ["寅", "午"],
  壬: ["卯", "巳"], 癸: ["卯", "巳"],
};

/** 문창귀인: 일간 기준. */
const MUNCHANG: Record<Stem, Branch> = {
  甲: "巳", 乙: "午", 丙: "申", 丁: "酉", 戊: "申", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯",
};

export interface GradeTier {
  level: 1 | 2 | 3 | 4 | 5;
  /** 유형 이름(숫자 등급 대신 화면·도장·감정서에 쓴다). 예: "대기만성형(大器晩成型)" */
  type: string;
  /** 유형 도장에 새길 두 글자 */
  seal: string;
  name: string;
  desc: string;
  /** 이 단계에 드는 사주의 비율(%) */
  share: number;
}

/** 상위부터 누적 비율로 자른다. 합계 100. */
export const GRADE_TIERS: GradeTier[] = [
  { level: 1, type: "천복형(天福型)", seal: "天福", name: "타고난 복을 쥔 사주", desc: "원국의 균형, 용신의 힘, 대운의 도움이 고루 갖춰진 드문 구성입니다.", share: 3 },
  { level: 2, type: "기세형(氣勢型)", seal: "氣勢", name: "기세가 뚜렷한 사주", desc: "강점이 분명하고 대운이 그 강점을 밀어 주는 구성입니다.", share: 12 },
  { level: 3, type: "중화형(中和型)", seal: "中和", name: "균형 잡힌 사주", desc: "치우침이 적어 꾸준히 쌓아 가는 힘이 좋은 구성입니다.", share: 35 },
  { level: 4, type: "대기만성형(大器晩成型)", seal: "大器", name: "때를 만나 크는 사주", desc: "원국의 빈자리를 대운이 채워 줄 때 폭발적으로 성장하는 구성입니다.", share: 35 },
  { level: 5, type: "개척형(開拓型)", seal: "開拓", name: "스스로 길을 내는 사주", desc: "치우친 기운이 뚜렷해, 그 기운을 다루는 법을 알면 오히려 개성이 되는 구성입니다.", share: 15 },
];

export const GRADE_TIERS_ZH: GradeTier[] = [
  { level: 1, type: "天福型", seal: "天福", name: "天生握福之命", desc: "命局平衡、用神有力、大運相助，三者兼備的少見組合。", share: 3 },
  { level: 2, type: "氣勢型", seal: "氣勢", name: "氣勢鮮明之命", desc: "優勢明確，大運也能推動這份優勢的組合。", share: 12 },
  { level: 3, type: "中和型", seal: "中和", name: "均衡穩健之命", desc: "偏頗較少，擅長穩紮穩打、持續累積的組合。", share: 35 },
  { level: 4, type: "大器晚成型", seal: "大器", name: "逢時而起之命", desc: "當大運補足命局的空缺時，便能大展身手的組合。", share: 35 },
  { level: 5, type: "開拓型", seal: "開拓", name: "自闢蹊徑之命", desc: "氣勢偏向鮮明，懂得駕馭這股能量時，反而成為獨特個性的組合。", share: 15 },
];

export const GRADE_TIERS_HANS: GradeTier[] = [
  { level: 1, type: "天福型", seal: "天福", name: "天生握福之命", desc: "命局平衡、用神有力、大运相助，三者兼备的少见组合。", share: 3 },
  { level: 2, type: "气势型", seal: "氣勢", name: "气势鲜明之命", desc: "优势明确，大运也能推动这份优势的组合。", share: 12 },
  { level: 3, type: "中和型", seal: "中和", name: "均衡稳健之命", desc: "偏颇较少，擅长稳扎稳打、持续累积的组合。", share: 35 },
  { level: 4, type: "大器晚成型", seal: "大器", name: "逢时而起之命", desc: "当大运补足命局的空缺时，便能大展身手的组合。", share: 35 },
  { level: 5, type: "开拓型", seal: "開拓", name: "自辟蹊径之命", desc: "气势偏向鲜明，懂得驾驭这股能量时，反而成为独特个性的组合。", share: 15 },
];

export const GRADE_TIERS_EN: GradeTier[] = [
  { level: 1, type: "Blessed Abundance type", seal: "天福", name: "A chart born holding good fortune", desc: "A rare make-up in which chart balance, a strong useful element and supportive luck pillars all come together.", share: 3 },
  { level: 2, type: "Rising Momentum type", seal: "氣勢", name: "A chart with clear momentum", desc: "Clear strengths, with luck pillars that push those strengths forward.", share: 12 },
  { level: 3, type: "Balanced Harmony type", seal: "中和", name: "A well-balanced chart", desc: "Little imbalance, with a strong capacity to build steadily over time.", share: 35 },
  { level: 4, type: "Late Bloomer type", seal: "大器", name: "A chart that grows when its time comes", desc: "Grows explosively when the luck pillars fill in what the natal chart lacks.", share: 35 },
  { level: 5, type: "Trailblazer type", seal: "開拓", name: "A chart that makes its own way", desc: "A distinct lean in energy that becomes a real asset once you learn how to work with it.", share: 15 },
];

export const gradeTiers = (locale: Locale = "ko") =>
  locale === "zh-Hant" ? GRADE_TIERS_ZH : locale === "zh-Hans" ? GRADE_TIERS_HANS : locale === "en" ? GRADE_TIERS_EN : GRADE_TIERS;

export interface GradeParts {
  /** 오행 균형 0~30 */
  balance: number;
  /** 신강·신약 중화도 0~15 */
  harmony: number;
  /** 용신이 드러나고 뿌리를 가졌는지 0~15 */
  yongsin: number;
  /** 0~80세 대운의 평균 용신 부합도 0~30 */
  daeun: number;
  /** 천을·문창귀인 0~10 */
  noble: number;
}

export interface Grade {
  /** 0~100 */
  score: number;
  parts: GradeParts;
  tier: GradeTier;
  /** 점수가 나보다 높은 사주의 비율(%) — "상위 n%" */
  topPercent: number;
  /** 같은 일주·격국·참고 용신 조합의 출현율 */
  rarity: { key: string; label: string; perThousand: number; oneIn: number };
  nobles: { name: "천을귀인" | "문창귀인"; has: boolean; populationPercent: number }[];
  /** 대운 부합도가 가장 높은 구간 */
  peak: { startAge: number; endAge: number; ganzhi: string; score: number } | null;
  /** 시각을 몰라 6글자로 계산했는지 */
  partial: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function gradeParts(params: {
  pillars: { hour: Pillar | null; day: Pillar; month: Pillar; year: Pillar };
  counts: Record<Element, number>;
  weighted: Record<Element, number>;
  strengthScore: number;
  analysis: Pick<Analysis, "usefulness" | "daeunScores">;
}): { parts: GradeParts; nobles: { cheoneul: boolean; munchang: boolean } } {
  const { pillars, weighted, counts, strengthScore, analysis } = params;
  const order = [pillars.hour, pillars.day, pillars.month, pillars.year].filter((p): p is Pillar => p !== null);

  // 1) 오행 균형: 평균에서 벗어난 정도(0이면 완전 균등)와 빠진 오행 수.
  const total = ELEMENTS.reduce((s, e) => s + weighted[e], 0);
  const avg = total / 5;
  const deviation = ELEMENTS.reduce((s, e) => s + Math.abs(weighted[e] - avg), 0);
  const maxDeviation = 2 * total * (1 - 1 / 5);
  const evenness = 1 - deviation / maxDeviation; // 0~1
  const missing = ELEMENTS.filter((e) => counts[e] === 0).length;
  const balance = Math.max(0, 30 * evenness - missing * 3);

  // 2) 중화도: 신강·신약 점수가 50에 가까울수록.
  const harmony = 15 * (1 - Math.abs(strengthScore - 50) / 50);

  // 3) 용신: 천간에 드러남(투출) + 지지에 뿌리 + 기신이 지나치지 않음.
  const u = analysis.usefulness;
  const revealed = order.some((p) => p.stemElement === u.yongsin);
  const rooted = order.some((p) => HIDDEN_STEMS[p.branch].some((s) => STEM_ELEMENT[s] === u.yongsin));
  const gisinCalm = weighted[u.gisin] <= avg;
  const yongsin = (revealed ? 7 : 0) + (rooted ? 5 : 0) + (gisinCalm ? 3 : 0);

  // 4) 대운: 0~80세(앞 8개 대운) 평균 부합도.
  const ds = analysis.daeunScores.slice(0, 8);
  const daeunAvg = ds.length ? ds.reduce((s, d) => s + d.score, 0) / ds.length : 50;
  const daeun = (30 * daeunAvg) / 100;

  // 5) 귀인: 일간 기준, 일지 포함 모든 지지에서 찾는다.
  const branches = order.map((p) => p.branch);
  const cheoneul = branches.some((b) => CHEONEUL[pillars.day.stem].includes(b));
  const munchang = branches.includes(MUNCHANG[pillars.day.stem]);
  const noble = (cheoneul ? 6 : 0) + (munchang ? 4 : 0);

  return {
    parts: { balance: round1(balance), harmony: round1(harmony), yongsin, daeun: round1(daeun), noble },
    nobles: { cheoneul, munchang },
  };
}

export const comboKey = (day: Pillar, gyeokguk: string, yongsin: Element) => `${day.stem}${day.branch}|${gyeokguk}|${yongsin}`;

export interface GradeStats {
  range: string;
  total: number;
  /** histogram[i] = 점수 i/10 (0.1 단위로 내림)인 사주 수, 길이 1001 */
  histogram: number[];
  combos: Record<string, number>;
  nobles: { cheoneul: number; munchang: number };
}

/** 점수가 s 이상인 사주 비율(%). */
function percentAtOrAbove(st: GradeStats, score: number): number {
  const idx = Math.floor(score * 10);
  let above = 0;
  for (let i = idx; i < st.histogram.length; i++) above += st.histogram[i];
  return (above / st.total) * 100;
}

export function tierFor(topPercent: number, locale: Locale = "ko"): GradeTier {
  const tiers = gradeTiers(locale);
  let cum = 0;
  for (const t of tiers) {
    cum += t.share;
    if (topPercent <= cum) return t;
  }
  return tiers[tiers.length - 1];
}

export function computeGrade(params: Parameters<typeof gradeParts>[0] & { gyeokguk: string; locale?: Locale }, st: GradeStats = stats as GradeStats): Grade {
  const { parts, nobles } = gradeParts(params);
  const score = round1(parts.balance + parts.harmony + parts.yongsin + parts.daeun + parts.noble);
  const topPercent = Math.max(0.1, round1(percentAtOrAbove(st, score)));
  const day = params.pillars.day;
  const key = comboKey(day, params.gyeokguk, params.analysis.usefulness.yongsin);
  const count = st.combos[key] ?? 0;
  const share = st.total ? count / st.total : 0;
  const ds = params.analysis.daeunScores.slice(0, 8);
  const best = ds.reduce<(typeof ds)[number] | null>((b, d) => (!b || d.score > b.score ? d : b), null);
  return {
    score,
    parts,
    tier: tierFor(topPercent, params.locale),
    topPercent,
    rarity: {
      key,
      label: engineText(params.locale).rarityLabel(`${day.stem}${day.branch}`, params.gyeokguk, params.analysis.usefulness.yongsin),
      perThousand: round1(share * 1000),
      oneIn: share > 0 ? Math.round(1 / share) : st.total,
    },
    nobles: [
      { name: "천을귀인", has: nobles.cheoneul, populationPercent: round1((st.nobles.cheoneul / st.total) * 100) },
      { name: "문창귀인", has: nobles.munchang, populationPercent: round1((st.nobles.munchang / st.total) * 100) },
    ],
    peak: best ? { startAge: best.startAge, endAge: best.startAge + 9, ganzhi: best.ganzhi, score: best.score } : null,
    partial: params.pillars.hour === null,
  };
}
