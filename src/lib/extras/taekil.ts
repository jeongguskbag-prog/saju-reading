// 택일록: 정한 기간의 날마다 일진(간지)을 세워, 의뢰인 사주와의 합충·용신 부합도와 전통 역법(황도·흑도, 건제 12직, 의기)을 함께 따져 좋은 날을 고른다.
import { Solar } from "lunar-javascript";
import type { SajuChart } from "../saju/calc";
import { splitGanZhi } from "../saju/gods";
import { ganzhiScore } from "../saju/analysis";
import { ELEMENT_KO, HIDDEN_STEMS, STEM_ELEMENT, type Branch, type Stem } from "../saju/constants";
import { branchRelation, stemRelation, type Relation } from "./relations";
import { COMMON_RULES, sectionsJsonSchema, writeJson } from "./ai";
import { sectionsTextSchema } from "./text";
import type { ExtraResult, SectionsText } from "./kinds";
import { ALMANAC_KO } from "./almanac";
export { ALMANAC_KO };
import { TAEKIL_PURPOSES, type TaekilPurpose, type TaekilRequest } from "./requests";

/** 목적별로 역서(曆書)의 '마땅한 일(宜)'에서 찾을 말 */
const PURPOSE_TERMS: Record<TaekilPurpose, string[]> = {
  wedding: ["嫁娶"],
  move: ["移徙", "入宅"],
  opening: ["开市", "开业"],
  contract: ["立券", "交易"],
  travel: ["出行"],
  construction: ["动土", "修造"],
};


const ZHIXING_KO: Record<string, string> = { 建: "건", 除: "제", 满: "만", 平: "평", 定: "정", 执: "집", 破: "파", 危: "위", 成: "성", 收: "수", 开: "개", 闭: "폐" };
const ZHIXING_SCORE: Record<string, number> = { 成: 10, 开: 10, 定: 5, 除: 5, 危: 3, 执: 3, 满: 2, 建: 0, 平: -3, 收: -3, 破: -15, 闭: -10 };

export interface TaekilDay {
  date: string;
  weekday: number;
  lunar: string;
  ganzhi: string;
  zhixing: string;
  tianshen: string;
  huangdao: boolean;
  yi: string[];
  ji: string[];
  fits: boolean;
  avoid: boolean;
  sonEomneun: boolean;
  withDay: Relation[];
  withYear: Relation[];
  withStem: Relation[];
  yongsin: number;
  score: number;
  /** 제외 이유(있으면 추천하지 않음) */
  excluded: string | null;
}

export interface TaekilComputed {
  purpose: TaekilPurpose;
  start: string;
  end: string;
  weekendsOnly: boolean;
  days: TaekilDay[];
  picks: string[];
  dayPillar: string;
  yearBranch: string;
}

const p2 = (n: number) => String(n).padStart(2, "0");
const branchElement = (b: Branch) => STEM_ELEMENT[HIDDEN_STEMS[b][HIDDEN_STEMS[b].length - 1]];

export function computeTaekil(chart: SajuChart, req: TaekilRequest): TaekilComputed {
  const day = chart.pillars.day;
  const yearB = chart.pillars.year.branch;
  const u = chart.analysis.usefulness;
  const terms = PURPOSE_TERMS[req.purpose];
  const days: TaekilDay[] = [];
  const [ys, ms, ds] = req.start.split("-").map(Number);
  const [ye, me, de] = req.end.split("-").map(Number);
  for (let t = Date.UTC(ys, ms - 1, ds); t <= Date.UTC(ye, me - 1, de); t += 86_400_000) {
    const d = new Date(t);
    const weekday = d.getUTCDay();
    if (req.weekendsOnly && weekday !== 0 && weekday !== 6) continue;
    const lunar = Solar.fromYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()).getLunar();
    const gz = lunar.getDayInGanZhi();
    const [s, b] = splitGanZhi(gz) as [Stem, Branch];
    const yi = lunar.getDayYi();
    const ji = lunar.getDayJi();
    const zx = lunar.getZhiXing();
    const huangdao = lunar.getDayTianShenType() === "黄道";
    const fits = yi.some((x) => terms.includes(x));
    const avoid = ji.some((x) => terms.includes(x));
    const lday = lunar.getDay();
    const sonEomneun = lday % 10 === 9 || lday % 10 === 0;
    const withDay = branchRelation(b, day.branch);
    const withYear = branchRelation(b, yearB);
    const withStem = stemRelation(s, day.stem);
    const yongsin = ganzhiScore(STEM_ELEMENT[s], branchElement(b), u);
    const has = (rs: Relation[], n: string) => rs.some((r) => r.name.startsWith(n));
    let score = yongsin * 0.4 + (fits ? 25 : 0) + (huangdao ? 10 : -5) + (ZHIXING_SCORE[zx] ?? 0);
    if (has(withStem, "천간합")) score += 5;
    if (has(withStem, "천간충")) score -= 8;
    if (has(withDay, "육합") || has(withDay, "삼합")) score += 8;
    if (has(withDay, "원진")) score -= 8;
    if (has(withYear, "충")) score -= 15;
    if (req.purpose === "move" && sonEomneun) score += 10;
    const excluded = avoid
      ? "역서에서 이 일을 꺼리는 날(忌)"
      : has(withDay, "충")
        ? "일진이 의뢰인의 일지와 충"
        : zx === "破"
          ? "건제 12직의 파일(破日)"
          : ji.includes("诸事不宜")
            ? "모든 일을 삼가는 날"
            : null;
    days.push({
      date: `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`,
      weekday,
      lunar: `음 ${lunar.getMonth() < 0 ? "윤" : ""}${Math.abs(lunar.getMonth())}.${lday}`,
      ganzhi: gz,
      zhixing: zx,
      tianshen: lunar.getDayTianShen(),
      huangdao,
      yi,
      ji,
      fits,
      avoid,
      sonEomneun,
      withDay,
      withYear,
      withStem,
      yongsin,
      score: Math.max(0, Math.min(100, Math.round(score))),
      excluded,
    });
  }
  const picks = days
    .filter((x) => !x.excluded)
    .sort((a, b) => b.score - a.score || (a.date < b.date ? -1 : 1))
    .slice(0, 7)
    .map((x) => x.date)
    .sort();
  return { purpose: req.purpose, start: req.start, end: req.end, weekendsOnly: Boolean(req.weekendsOnly), days, picks, dayPillar: day.stem + day.branch, yearBranch: yearB };
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const ko = (xs: string[]) => xs.map((x) => ALMANAC_KO[x]).filter(Boolean);
const relText = (rs: Relation[]) => rs.map((r) => r.name).join("·");

export function taekilPrompt(chart: SajuChart, c: TaekilComputed) {
  const pick = c.days.filter((d) => c.picks.includes(d.date));
  return {
    목적: TAEKIL_PURPOSES[c.purpose],
    기간: `${c.start} ~ ${c.end}${c.weekendsOnly ? " (주말만)" : ""}`,
    의뢰인: `일주 ${c.dayPillar}, 띠 ${c.yearBranch}, 참고 용신 ${ELEMENT_KO[chart.analysis.usefulness.yongsin]}`,
    추천일: pick.map(
      (d) =>
        `${d.date}(${WD[d.weekday]}) ${d.lunar} 일진 ${d.ganzhi} · ${d.huangdao ? "황도" : "흑도"} ${d.tianshen} · 12직 ${ZHIXING_KO[d.zhixing] ?? d.zhixing} · 마땅한 일 ${ko(d.yi).join(",") || "-"}${d.fits ? "(목적과 맞음)" : ""} · 일지와 ${relText(d.withDay) || "무난"} · 용신 부합 ${d.yongsin} · 점수 ${d.score}${d.sonEomneun ? " · 손 없는 날" : ""}`,
    ),
    피한날수: c.days.filter((d) => d.excluded).length,
    전체날수: c.days.length,
  };
}

const SYSTEM = `당신은 전통 택일법(擇日法)과 명리에 밝은 품격 있는 감정가입니다. 유료 감정서 "택일록"의 문장을 씁니다.
계산으로 고른 추천일마다 왜 좋은지(일진과 의뢰인 사주의 관계, 황도·흑도, 건제 12직, 역서의 마땅한 일)를 근거로 설명하고, 날짜를 정할 때의 현실적인 기준(일정·사람·비용)과 함께 고르도록 돕습니다.
추천일 목록에 없는 날짜를 새로 추천하지 않습니다.
${COMMON_RULES}`;

export type TaekilResult = ExtraResult<TaekilRequest, TaekilComputed, SectionsText>;

export async function generateTaekil(chart: SajuChart, request: TaekilRequest): Promise<TaekilResult> {
  const computed = computeTaekil(chart, request);
  const user = `"택일록"을 씁니다. 목적: ${TAEKIL_PURPOSES[request.purpose]}.
- summary: 이번 택일의 결론을 한 줄로.
- sections: 장 ${Math.min(computed.picks.length, 7) + 2}개. 첫 장은 "택일의 기준"(의뢰인 사주에서 살핀 점, 피한 날의 기준), 이어서 추천일마다 한 장씩(제목은 "YYYY년 M월 D일(요일)" 형식, 문단 2개, 장당 250~450자), 마지막 장은 "날을 고르실 때".
- advice: 그날을 잘 쓰기 위한 실천 조언 3~5개.

[택일 JSON]
${JSON.stringify(taekilPrompt(chart, computed), null, 2)}`;
  const text = computed.picks.length
    ? await writeJson({ system: SYSTEM, user, schema: sectionsJsonSchema("택일록의 장", `${computed.picks.length + 2}개`), zod: sectionsTextSchema, label: "택일록" })
    : { summary: "고르신 기간에는 조건에 맞는 날이 없었습니다.", sections: [], advice: [] };
  return { kind: "taekil", request, computed, text };
}
