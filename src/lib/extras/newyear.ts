// 신년 운세록: 한 해(세운)와 열두 달(월운)을 의뢰인의 원국에 겹쳐 읽는다. 삼재·대운 교체·원국과의 합충을 함께 본다.
import type { SajuChart } from "../saju/calc";
import { branchTenGod, tenGod, yearGanZhi } from "../saju/gods";
import { monthlyFlow, yearScore, type MonthFlow } from "../saju/analysis";
import { BRANCH_ANIMAL, ELEMENT_KO, type Branch, type Element, type Stem } from "../saju/constants";
import type { TenGod } from "../saju/constants";
import { branchRelation, stemRelation, type Relation } from "./relations";
import { COMMON_RULES, writeJson } from "./ai";
import type { ExtraResult, SectionsText } from "./kinds";
import type { NewyearRequest } from "./requests";
import { z } from "zod";

/** 삼재: 띠(년지) 삼합의 다음 방합 세 해. 들·눌·날삼재 */
const SAMJAE: Record<string, Branch[]> = {
  申子辰: ["寅", "卯", "辰"],
  巳酉丑: ["亥", "子", "丑"],
  寅午戌: ["申", "酉", "戌"],
  亥卯未: ["巳", "午", "未"],
};
const SAMJAE_STAGE = ["들삼재", "눌삼재", "날삼재"] as const;

export function samjae(birthBranch: Branch, yearBranch: Branch): (typeof SAMJAE_STAGE)[number] | null {
  const group = Object.keys(SAMJAE).find((k) => k.includes(birthBranch));
  if (!group) return null;
  const i = SAMJAE[group].indexOf(yearBranch);
  return i >= 0 ? SAMJAE_STAGE[i] : null;
}

export interface NewyearMonth extends MonthFlow {
  /** 월지와 일지의 관계 */
  withDay: Relation[];
}

export interface NewyearComputed {
  year: number;
  ganzhi: string;
  stem: Stem;
  branch: Branch;
  animal: string;
  stemTenGod: TenGod;
  branchTenGod: TenGod;
  score: number;
  /** 세운 천간과 일간, 세운 지지와 원국 지지들의 관계 */
  withChart: { label: string; target: string; relations: Relation[] }[];
  samjae: string | null;
  daeun: { ganzhi: string; startYear: number; endYear: number; changes: boolean; next: string | null } | null;
  months: NewyearMonth[];
  best: number[];
  care: number[];
  yongsin: Element;
  lucky: SajuChart["analysis"]["lucky"];
}

export function computeNewyear(chart: SajuChart, year: number): NewyearComputed {
  const [stem, branch] = yearGanZhi(year);
  const day = chart.pillars.day;
  const u = chart.analysis.usefulness;
  const p = chart.pillars;
  const withChart = [
    { label: "일간", target: day.stem, relations: stemRelation(stem, day.stem) },
    ...[p.year, p.month, p.day, p.hour]
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .map((x) => ({ label: x.label.replace("주", "지"), target: x.branch, relations: branchRelation(branch, x.branch) })),
  ];
  const periods = chart.daeun.periods;
  const i = periods.findIndex((d) => year >= d.startYear && year <= d.endYear);
  const cur = i >= 0 ? periods[i] : null;
  const months = monthlyFlow(year, day.stem, u).map((m) => ({ ...m, withDay: branchRelation(m.branch as Branch, day.branch) }));
  const ranked = months.map((m, k) => ({ k: k + 1, s: m.score - (m.withDay.some((r) => r.tone < 0) ? 5 : 0) }));
  const best = [...ranked].sort((a, b) => b.s - a.s || a.k - b.k).slice(0, 3).map((x) => x.k).sort((a, b) => a - b);
  const care = [...ranked].sort((a, b) => a.s - b.s || a.k - b.k).slice(0, 2).map((x) => x.k).sort((a, b) => a - b);
  return {
    year,
    ganzhi: stem + branch,
    stem,
    branch,
    animal: BRANCH_ANIMAL[branch],
    stemTenGod: tenGod(day.stem, stem),
    branchTenGod: branchTenGod(day.stem, branch),
    score: yearScore(year, u).score,
    withChart,
    samjae: samjae(p.year.branch, branch),
    daeun: cur
      ? {
          ganzhi: cur.stem + cur.branch,
          startYear: cur.startYear,
          endYear: cur.endYear,
          changes: cur.startYear === year,
          next: cur.endYear === year && periods[i + 1] ? periods[i + 1].stem + periods[i + 1].branch : null,
        }
      : null,
    months,
    best,
    care,
    yongsin: u.yongsin,
    lucky: chart.analysis.lucky,
  };
}

export interface NewyearText extends SectionsText {
  months: string[];
}

const newyearTextSchema: z.ZodType<NewyearText> = z.object({
  summary: z.string().min(1),
  sections: z.array(z.object({ heading: z.string().min(1), paragraphs: z.array(z.string().min(1)).min(1) })).min(1),
  advice: z.array(z.string().min(1)),
  months: z.array(z.string().min(1)).length(12),
});

const jsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "한 해를 한 줄로(40~80자)" },
    sections: {
      type: "array",
      description: "한 해 풀이의 장(6개)",
      items: {
        type: "object",
        properties: { heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } } },
        required: ["heading", "paragraphs"],
        additionalProperties: false,
      },
    },
    months: { type: "array", items: { type: "string" }, description: "양력 1월~12월 순서로 정확히 12개, 달마다 2~3문장(120~200자)" },
    advice: { type: "array", items: { type: "string" }, description: "한 해 실천 조언 4~5개" },
  },
  required: ["summary", "sections", "months", "advice"],
  additionalProperties: false,
};

const rel = (rs: Relation[]) => (rs.length ? rs.map((r) => r.name).join(", ") : "없음");

export function newyearPrompt(chart: SajuChart, c: NewyearComputed) {
  const p = chart.pillars;
  return {
    감정연도: `${c.year}년 ${c.ganzhi}(${c.animal}띠 해)`,
    명식: [p.year, p.month, p.day, p.hour].filter(Boolean).map((x) => `${x!.label} ${x!.stem}${x!.branch}`).join(" / ") + (p.hour ? "" : " (시각 모름)"),
    일간: `${p.day.stem} ${ELEMENT_KO[chart.dayMaster.element]}`,
    신강약: chart.strength.label,
    격국: chart.analysis.gyeokguk.label,
    참고용신: ELEMENT_KO[c.yongsin],
    세운십신: `천간 ${c.stemTenGod} · 지지 ${c.branchTenGod}`,
    세운용신부합도: `${c.score}/100 (50이 중립)`,
    원국과의관계: c.withChart.map((w) => `${w.label} ${w.target}: ${rel(w.relations)}`),
    삼재: c.samjae ?? "해당 없음",
    대운: c.daeun
      ? `${c.daeun.ganzhi} 대운(${c.daeun.startYear}~${c.daeun.endYear})${c.daeun.changes ? ", 올해 새 대운이 시작됨" : ""}${c.daeun.next ? `, 다음 해부터 ${c.daeun.next} 대운` : ""}`
      : "대운 시작 전",
    월운: c.months.map((m, i) => `${i + 1}월 ${m.stem}${m.branch}(절입 ${m.startDate}) ${m.stemTenGod}/${m.branchTenGod} 부합도 ${m.score} ${m.mark}${m.withDay.length ? ` · 일지와 ${rel(m.withDay)}` : ""}`),
    좋은달: c.best.map((m) => `${m}월`).join(", "),
    살필달: c.care.map((m) => `${m}월`).join(", "),
    개운: `색 ${c.lucky.colors}, 방향 ${c.lucky.direction}, 숫자 ${c.lucky.numbers}, 습관 ${c.lucky.habits}`,
  };
}

const SYSTEM = `당신은 정통 명리학의 세운·월운 해석에 밝은 품격 있는 감정가입니다. 유료 감정서 "신년 운세록"의 문장을 씁니다.
한 해의 간지가 의뢰인의 원국과 대운에 어떻게 들어오는지를 근거로, 한 해의 흐름과 달마다 할 일을 구체적으로 풀어 줍니다. 삼재는 전통적으로 조심을 권하는 시기라는 뜻으로만 담담하게 다루고, 부적·굿 같은 비용이 드는 대처를 권하지 않습니다.
${COMMON_RULES}`;

export type NewyearResult = ExtraResult<NewyearRequest, NewyearComputed, NewyearText>;

export async function generateNewyear(chart: SajuChart, request: NewyearRequest): Promise<NewyearResult> {
  const computed = computeNewyear(chart, request.year);
  const user = `"신년 운세록"을 씁니다. 감정 연도: ${request.year}년.
- summary: 한 해를 한 줄로.
- sections: 6개 장, 장마다 2~3개 문단(장당 400~700자). 순서와 제목:
  1) "${request.year}년 ${computed.ganzhi}, 한 해의 큰 흐름" — 세운 십신·용신 부합도·원국과의 합충
  2) "대운 속의 한 해" — 지금 대운과의 관계, 대운이 바뀌면 그 의미${computed.samjae ? ", 삼재" : ""}
  3) "일과 재물"
  4) "관계와 인연"
  5) "몸과 생활 리듬" — 생활 습관 제안까지만
  6) "좋은 달과 살필 달" — 좋은달·살필달을 근거와 함께
- months: 양력 1월부터 12월까지 정확히 12개. 각 달의 월운 간지·십신·일지와의 관계를 근거로 그달에 할 일.
- advice: 한 해 실천 조언 4~5개(개운 색·방향 활용 포함 가능).

[신년 JSON]
${JSON.stringify(newyearPrompt(chart, computed), null, 2)}`;
  const text = await writeJson({ system: SYSTEM, user, schema: jsonSchema, zod: newyearTextSchema, label: "신년 운세록", maxTokens: 20000 });
  return { kind: "newyear", request, computed, text };
}
