// 연애운 숏 감정서: 배우자성(남: 재성, 여: 관성), 배우자 자리(일지), 도화(桃花), 앞으로 3년의 세운과 올해·내년 월운에서
// 일지와 합하거나 배우자성·도화가 들어오는 때를 찾아 인연 시기를 고른다. AI는 이 계산값을 근거로 짧은 문장만 쓴다.
import type { SajuChart } from "../saju/calc";
import { branchTenGod, tenGod, yearGanZhi } from "../saju/gods";
import { monthlyFlow } from "../saju/analysis";
import { BRANCH_ANIMAL, ELEMENT_KO, STEM_ELEMENT, type Branch, type Element, type Stem, type TenGod } from "../saju/constants";
import { branchRelation } from "./relations";
import { COMMON_RULES, sectionsJsonSchema, writeJson } from "./ai";
import { sectionsTextSchema } from "./text";
import type { ExtraResult, SectionsText } from "./kinds";

/** 삼합 무리별 도화(桃花) 지지 */
const PEACH: Record<string, Branch> = { 申子辰: "酉", 寅午戌: "卯", 巳酉丑: "午", 亥卯未: "子" };
export function peachBranch(b: Branch): Branch {
  return PEACH[Object.keys(PEACH).find((k) => k.includes(b))!];
}

/** 일지와 육합하는 지지(잘 맞는 상대의 띠를 고를 때 참고) */
const SIX_COMBINE: Record<Branch, Branch> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };

export interface LoveTiming {
  label: string;
  ganzhi: string;
  reasons: string[];
}

export interface LoveComputed {
  gender: "male" | "female";
  /** 배우자성 이름(재성/관성)과 원국에 있는 수 */
  spouseStar: { name: string; gods: TenGod[]; count: number };
  /** 배우자 자리(일지)와 그 십신 */
  spousePalace: { branch: Branch; tenGod: TenGod };
  /** 도화 지지와 원국에 있는지 */
  peach: { branch: Branch; animal: string; inChart: boolean };
  dayMaster: { stem: Stem; element: Element };
  yongsin: Element;
  /** 앞으로 3년 중 인연이 들어오기 쉬운 해 */
  years: LoveTiming[];
  /** 올해·내년 중 인연이 들어오기 쉬운 달(최대 4) */
  months: LoveTiming[];
  /** 일지와 육합·삼합하는 띠(참고) */
  goodAnimals: string[];
}

const SPOUSE: Record<"male" | "female", { name: string; gods: TenGod[] }> = {
  male: { name: "재성(財星)", gods: ["정재", "편재"] },
  female: { name: "관성(官星)", gods: ["정관", "편관"] },
};

export function computeLove(chart: SajuChart, now = new Date()): LoveComputed {
  const gender = chart.input.gender === "female" ? "female" : "male";
  const spouse = SPOUSE[gender];
  const day = chart.pillars.day;
  const dayStem = day.stem as Stem;
  const dayBranch = day.branch as Branch;
  const pillars = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour].filter((p): p is NonNullable<typeof p> => Boolean(p));
  const count = spouse.gods.reduce((s, g) => s + (chart.tenGodCounts[g] ?? 0), 0);
  const peach = peachBranch(chart.pillars.year.branch as Branch);
  const peachDay = peachBranch(dayBranch);
  const inChart = pillars.some((p) => p.branch === peach || p.branch === peachDay);

  const reasonsFor = (stem: Stem, branch: Branch): string[] => {
    const r: string[] = [];
    if (spouse.gods.includes(tenGod(dayStem, stem))) r.push(`천간에 배우자성(${tenGod(dayStem, stem)})`);
    if (spouse.gods.includes(branchTenGod(dayStem, branch))) r.push(`지지에 배우자성(${branchTenGod(dayStem, branch)})`);
    const rel = branchRelation(branch, dayBranch);
    if (rel.some((x) => x.name === "육합")) r.push("배우자 자리(일지)와 육합");
    if (rel.some((x) => x.name.startsWith("삼합"))) r.push("배우자 자리(일지)와 삼합");
    if (branch === peach || branch === peachDay) r.push("도화(桃花)가 들어옴");
    return r;
  };

  const kYear = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear();
  const years: LoveTiming[] = [];
  for (let y = kYear; y < kYear + 3; y++) {
    const [s, b] = yearGanZhi(y);
    const reasons = reasonsFor(s as Stem, b as Branch);
    if (reasons.length) years.push({ label: `${y}년`, ganzhi: s + b, reasons });
  }

  const kMonth = new Date(now.getTime() + 9 * 3_600_000).getUTCMonth() + 1;
  const monthCands: (LoveTiming & { weight: number; order: number })[] = [];
  for (const y of [kYear, kYear + 1]) {
    monthlyFlow(y, dayStem, chart.analysis.usefulness).forEach((m, i) => {
      if (y === kYear && i + 1 < kMonth) return;
      const reasons = reasonsFor(m.stem as Stem, m.branch as Branch);
      if (reasons.length) monthCands.push({ label: `${y}년 ${i + 1}월`, ganzhi: m.stem + m.branch, reasons, weight: reasons.length * 100 + m.score, order: y * 100 + i + 1 });
    });
  }
  const months = monthCands
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .sort((a, b) => a.order - b.order)
    .map(({ weight: _w, order: _o, ...t }) => t);

  const trine = ["申子辰", "寅午戌", "巳酉丑", "亥卯未"].find((k) => k.includes(dayBranch))!;
  const goodAnimals = [...new Set([SIX_COMBINE[dayBranch], ...([...trine] as Branch[]).filter((b) => b !== dayBranch)])].map((b) => `${BRANCH_ANIMAL[b]}띠`);

  return {
    gender,
    spouseStar: { name: spouse.name, gods: spouse.gods, count },
    spousePalace: { branch: dayBranch, tenGod: branchTenGod(dayStem, dayBranch) },
    peach: { branch: peach, animal: BRANCH_ANIMAL[peach], inChart },
    dayMaster: { stem: dayStem, element: STEM_ELEMENT[dayStem] },
    yongsin: chart.analysis.usefulness.yongsin,
    years,
    months,
    goodAnimals,
  };
}

export function lovePrompt(chart: SajuChart, c: LoveComputed) {
  const p = chart.pillars;
  return {
    성별: c.gender === "male" ? "남성" : "여성",
    명식: [p.year, p.month, p.day, p.hour].filter(Boolean).map((x) => `${x!.label} ${x!.stem}${x!.branch}`).join(" / ") + (p.hour ? "" : " (시각 모름)"),
    일간: `${c.dayMaster.stem} ${ELEMENT_KO[c.dayMaster.element]}`,
    신강약: chart.strength.label,
    참고용신: ELEMENT_KO[c.yongsin],
    배우자성: `${c.spouseStar.name}(${c.spouseStar.gods.join("·")}) 원국에 ${c.spouseStar.count}개`,
    배우자자리: `일지 ${c.spousePalace.branch}(${c.spousePalace.tenGod})`,
    도화: `${c.peach.branch}(${c.peach.animal}) · 원국에 ${c.peach.inChart ? "있음" : "없음"}`,
    인연이드는해: c.years.length ? c.years.map((y) => `${y.label} ${y.ganzhi}: ${y.reasons.join(", ")}`) : ["앞으로 3년 중 뚜렷한 해 없음"],
    인연이드는달: c.months.length ? c.months.map((m) => `${m.label} ${m.ganzhi}: ${m.reasons.join(", ")}`) : ["올해·내년 중 뚜렷한 달 없음"],
    잘맞는띠참고: c.goodAnimals.join(", "),
  };
}

const SYSTEM = `당신은 정통 명리학으로 연애·인연을 읽는 품격 있는 감정가입니다. 짧은 유료 감정서 "연애운 숏 감정서"의 문장을 씁니다.
배우자성·배우자 자리(일지)·도화와 세운·월운의 계산값을 근거로, 연애 성향과 인연 시기, 잘 맞는 상대, 조심할 점을 따뜻하고 구체적으로 풀어 줍니다.
결혼·이별을 단정하지 않고, 성별·연애 방식에 대한 고정관념을 강요하지 않습니다. 띠 궁합은 참고 정도로만 가볍게 언급합니다.
${COMMON_RULES}`;

export type LoveResult = ExtraResult<Record<string, never>, LoveComputed, SectionsText>;

export async function generateLove(chart: SajuChart, paidAt: Date): Promise<LoveResult> {
  const computed = computeLove(chart, paidAt);
  const user = `"연애운 숏 감정서"를 씁니다. 짧고 핵심만, 전체 2,000~2,800자.
- summary: 연애운을 한 줄로.
- sections: 4개 장, 장마다 2개 문단(장당 300~500자). 순서와 제목:
  1) "나의 연애 성향" — 일간·배우자성·배우자 자리로 보는 사랑하는 방식
  2) "인연이 들어오는 때" — 인연이드는해·인연이드는달을 근거와 함께(없으면 스스로 만들어 가는 시기로)
  3) "잘 맞는 상대" — 용신 오행을 채워 주는 사람의 성향, 띠는 참고로만
  4) "연애에서 살필 점" — 배우자성이 많거나 적을 때, 도화의 유무에 따라
- advice: 연애운을 살리는 실천 3~4개.

[연애운 JSON]
${JSON.stringify(lovePrompt(chart, computed), null, 2)}`;
  const text = await writeJson({
    system: SYSTEM,
    user,
    schema: sectionsJsonSchema("연애운 풀이의 장", "4개"),
    zod: sectionsTextSchema,
    label: "연애운 숏 감정서",
    maxTokens: 8000,
  });
  return { kind: "love", request: {}, computed, text };
}
