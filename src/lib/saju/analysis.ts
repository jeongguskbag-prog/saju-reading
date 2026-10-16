// 상업용 감정서에 들어가는 추가 분석. 모두 결정적 규칙으로 계산해 같은 사주에는 항상 같은 결과가 나온다.
// 격국·용신은 학파마다 답이 다르므로 한 가지 규칙(월지 기준 격국, 억부·균형 기준 용신)으로 고정하고 "참고"로 표기한다.
import { Solar } from "lunar-javascript";
import { CONTROLS, ELEMENTS, GENERATES, HIDDEN_STEMS, STEM_ELEMENT, type Element, type TenGod } from "./constants";
import { branchTenGod, splitGanZhi, tenGod, yearGanZhi } from "./gods";
import type { DaeunPeriod, Pillar } from "./calc";
import { engineText, gyeokgukLabel, isZh, zhTables, type Locale } from "./locale";

/** 십신을 현대적·심리학적 언어로 옮긴 표현. 화면, PDF, AI 지시문이 함께 쓴다. */
export const TEN_GOD_MODERN: Record<TenGod, string> = {
  비견: "독립심과 자기 주도성",
  겁재: "경쟁심과 강한 추진력",
  식신: "전문성과 꾸준한 생산력",
  상관: "창의적 표현력 및 퍼스널 브랜딩 적성",
  편재: "프로젝트형 수익 창출력 및 투자 감각",
  정재: "안정적인 자산 관리력과 성실한 축적",
  편관: "위기 대응력과 돌파형 리더십",
  정관: "원칙과 책임감, 조직 적응력",
  편인: "전문 기획력 및 남다른 직관력",
  정인: "학습력과 수용성, 신뢰를 얻는 힘",
};

/** 오행별 개운 요소(전통 오행 배속). */
export const LUCKY_BY_ELEMENT: Record<Element, { colors: string; numbers: string; direction: string; habits: string }> = {
  wood: { colors: "초록·청록", numbers: "3, 8", direction: "동쪽", habits: "아침 산책, 식물 가꾸기, 새로운 배움 시작" },
  fire: { colors: "빨강·주황·보라", numbers: "2, 7", direction: "남쪽", habits: "햇볕 쬐기, 사람 만나기, 발표·표현 활동" },
  earth: { colors: "노랑·황토·베이지", numbers: "5, 10", direction: "중앙(집·사무실 중심)", habits: "규칙적인 식사, 일정 정리, 저축 습관" },
  metal: { colors: "흰색·은색·금색", numbers: "4, 9", direction: "서쪽", habits: "정리정돈, 호흡 운동, 원칙 세우기" },
  water: { colors: "검정·남색", numbers: "1, 6", direction: "북쪽", habits: "충분한 수면, 독서·명상, 물 자주 마시기" },
};

export interface Usefulness {
  /** 참고 용신 오행 */
  yongsin: Element;
  /** 용신을 생해 주는 오행 */
  huisin: Element;
  /** 용신을 극하는 오행 */
  gisin: Element;
  method: string;
}

export interface MonthFlow {
  year: number;
  /** 절입(달이 바뀌는) 날짜 YYYY-MM-DD */
  startDate: string;
  stem: string;
  branch: string;
  stemTenGod: TenGod;
  branchTenGod: TenGod;
  /** 0~100, 용신 부합도 */
  score: number;
  mark: "좋음" | "보통" | "주의";
}

export interface Analysis {
  /** name은 내부 키(한국어, 등급 통계 조합에 쓰임), label은 화면용 */
  gyeokguk: { name: string; label: string; basis: string };
  usefulness: Usefulness;
  /** 대운별 용신 부합도(0~100, 50이 중립) */
  daeunScores: { startAge: number; startYear: number; ganzhi: string; score: number }[];
  /** 올해·내년 절기 기준 월별 흐름 */
  monthly: MonthFlow[];
  lucky: (typeof LUCKY_BY_ELEMENT)[Element] & { element: Element };
  /** 원국에 나타난 십신과 현대적 해석 */
  tenGodGuide: { god: TenGod; count: number; modern: string }[];
  reportYears: [number, number];
  /** 올해·내년 세운의 용신 부합도 */
  yearScores: { year: number; ganzhi: string; score: number }[];
}

/** 월지 정기(본기)가 천간에 드러나면 그 십신, 아니면 월지 정기의 십신으로 격을 정한다. 비견·겁재는 건록·양인격으로 부른다. */
export function determineGyeokguk(day: Pillar, month: Pillar, others: Pillar[], locale: Locale = "ko"): Analysis["gyeokguk"] {
  const hidden = HIDDEN_STEMS[month.branch];
  const main = hidden[hidden.length - 1];
  const visibleStems = [month.stem, ...others.map((p) => p.stem)];
  const revealed = hidden.slice().reverse().find((h) => visibleStems.includes(h));
  const base = revealed ?? main;
  const god = tenGod(day.stem, base);
  const name = god === "비견" ? "건록격" : god === "겁재" ? "양인격" : `${god}격`;
  const basis = engineText(locale).gyeokgukBasis(month.branch, base, Boolean(revealed));
  return { name, label: gyeokgukLabel(name, locale), basis };
}

const generatorOf = (e: Element) => ELEMENTS.find((x) => GENERATES[x] === e)!;
const controllerOf = (e: Element) => ELEMENTS.find((x) => CONTROLS[x] === e)!;

/** 억부(신강·신약)와 오행 균형으로 참고 용신을 고른다. */
export function determineUsefulness(dayElement: Element, strengthScore: number, weighted: Record<Element, number>, locale: Locale = "ko"): Usefulness {
  const resource = generatorOf(dayElement); // 인성
  const output = GENERATES[dayElement]; // 식상
  const wealth = CONTROLS[dayElement]; // 재성
  const officer = controllerOf(dayElement); // 관성
  let candidates: Element[];
  let kind: "weak" | "strong" | "balanced";
  if (strengthScore < 40) {
    candidates = [resource, dayElement];
    kind = "weak";
  } else if (strengthScore > 60) {
    candidates = [output, wealth, officer];
    kind = "strong";
  } else {
    candidates = [...ELEMENTS];
    kind = "balanced";
  }
  // 동점이면 후보 순서를 따른다.
  const yongsin = candidates.reduce((best, e) => (weighted[e] < weighted[best] ? e : best), candidates[0]);
  return { yongsin, huisin: generatorOf(yongsin), gisin: controllerOf(yongsin), method: engineText(locale).usefulnessMethod(kind) };
}

const elementScore = (e: Element, u: Usefulness) => (e === u.yongsin ? 2 : e === u.huisin ? 1 : e === u.gisin ? -2 : 0);

/** 간지 한 쌍의 용신 부합도. 천간 1, 지지 1.5 비중, 50이 중립. */
export function ganzhiScore(stemElement: Element, branchElement: Element, u: Usefulness): number {
  const raw = elementScore(stemElement, u) + 1.5 * elementScore(branchElement, u); // -5 ~ 5
  return Math.max(0, Math.min(100, Math.round(50 + raw * 10)));
}

const markOf = (score: number): MonthFlow["mark"] => (score >= 65 ? "좋음" : score <= 35 ? "주의" : "보통");
const pad = (n: number) => String(n).padStart(2, "0");

/** 해당 연도의 12절 기준 월별 간지. 양력 각 달 20일이 속한 절기 달을 쓴다(절입일은 양력 4~8일 사이). */
export function monthlyFlow(year: number, dayStem: Pillar["stem"], u: Usefulness): MonthFlow[] {
  const months: MonthFlow[] = [];
  for (let m = 1; m <= 12; m++) {
    const lunar = Solar.fromYmdHms(year, m, 20, 12, 0, 0).getLunar();
    const [stem, branch] = splitGanZhi(lunar.getEightChar().getMonth());
    const jie = lunar.getPrevJie(true).getSolar();
    const score = ganzhiScore(STEM_ELEMENT[stem], branchElementOf(branch), u);
    months.push({
      year,
      startDate: `${jie.getYear()}-${pad(jie.getMonth())}-${pad(jie.getDay())}`,
      stem,
      branch,
      stemTenGod: tenGod(dayStem, stem),
      branchTenGod: branchTenGod(dayStem, branch),
      score,
      mark: markOf(score),
    });
  }
  return months;
}

function branchElementOf(branch: Pillar["branch"]): Element {
  const hidden = HIDDEN_STEMS[branch];
  return STEM_ELEMENT[hidden[hidden.length - 1]];
}

export function analyze(params: {
  pillars: { hour: Pillar | null; day: Pillar; month: Pillar; year: Pillar };
  weighted: Record<Element, number>;
  tenGodCounts: Partial<Record<TenGod, number>>;
  strengthScore: number;
  daeun: DaeunPeriod[];
  now: Date;
  /** 월별 흐름 계산을 건너뛴다(등급 통계를 대량으로 만들 때만 사용). */
  skipMonthly?: boolean;
  locale?: Locale;
}): Analysis {
  const { pillars, weighted, tenGodCounts, strengthScore, daeun, now, skipMonthly, locale = "ko" } = params;
  const zh = isZh(locale) ? zhTables(locale) : null;
  const dayElement = STEM_ELEMENT[pillars.day.stem];
  const others = [pillars.year, pillars.day, pillars.hour].filter((p): p is Pillar => p !== null);
  const usefulness = determineUsefulness(dayElement, strengthScore, weighted, locale);
  const thisYear = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear();
  const reportYears: [number, number] = [thisYear, thisYear + 1];

  return {
    gyeokguk: determineGyeokguk(pillars.day, pillars.month, others.filter((p) => p !== pillars.day), locale),
    usefulness,
    daeunScores: daeun.map((d) => ({
      startAge: d.startAge,
      startYear: d.startYear,
      ganzhi: d.stem + d.branch,
      score: ganzhiScore(STEM_ELEMENT[d.stem], branchElementOf(d.branch), usefulness),
    })),
    monthly: skipMonthly ? [] : [...monthlyFlow(reportYears[0], pillars.day.stem, usefulness), ...monthlyFlow(reportYears[1], pillars.day.stem, usefulness)],
    lucky: { ...(zh ? zh.lucky : LUCKY_BY_ELEMENT)[usefulness.yongsin], element: usefulness.yongsin },
    tenGodGuide: (Object.keys(TEN_GOD_MODERN) as TenGod[])
      .filter((g) => (tenGodCounts[g] ?? 0) > 0)
      .map((g) => ({ god: g, count: tenGodCounts[g]!, modern: (zh ? zh.modern : TEN_GOD_MODERN)[g] })),
    reportYears,
    yearScores: reportYears.map((y) => ({ year: y, ...yearScore(y, usefulness) })),
  };
}

/** 세운(연운) 간지와 용신 부합도. */
export function yearScore(year: number, u: Usefulness): { ganzhi: string; score: number } {
  const [s, b] = yearGanZhi(year);
  return { ganzhi: s + b, score: ganzhiScore(STEM_ELEMENT[s], branchElementOf(b), u) };
}
