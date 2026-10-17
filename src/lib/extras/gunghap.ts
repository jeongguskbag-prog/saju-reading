// 연분록(緣分錄): 두 사람 궁합. 두 명식의 일간·일지(배우자 자리)·년지(띠)·오행 보완·용신 상호 도움·대운 동행을 계산한다.
import { calculateSaju, type BirthInput, type SajuChart } from "../saju/calc";
import { BRANCH_ANIMAL, ELEMENT_KO, type Element } from "../saju/constants";
import { branchRelation, stemRelation, type Relation } from "./relations";
import { COMMON_RULES, sectionsJsonSchema, writeJson } from "./ai";
import { sectionsTextSchema } from "./text";
import type { ExtraResult, SectionsText } from "./kinds";

import { GUNGHAP_RELATIONS, type GunghapRelation, type GunghapRequest } from "./requests";
export { GUNGHAP_RELATIONS };

const ELEMENTS: Element[] = ["wood", "fire", "earth", "metal", "water"];
const GENERATES: Record<Element, Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CONTROLS: Record<Element, Element> = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };

export interface GunghapPerson {
  name: string;
  gender: "male" | "female";
  solarDate: string;
  hourKnown: boolean;
  pillars: { label: string; stem: string; branch: string; stemElement: Element; branchElement: Element }[];
  dayMaster: { stem: string; element: Element };
  zodiac: string;
  yongsin: Element;
  weighted: Record<Element, number>;
}

export interface GunghapComputed {
  relation: GunghapRelation;
  a: GunghapPerson;
  b: GunghapPerson;
  dayMaster: { relations: Relation[]; flow: string };
  spouse: { relations: Relation[]; a: string; b: string };
  zodiac: { relations: Relation[]; a: string; b: string };
  complement: { aGivesB: Element[]; bGivesA: Element[] };
  yongsinHelp: { aToB: number; bToA: number };
  scores: { label: string; score: number; max: number }[];
  total: number;
  tier: { name: string; desc: string };
  timeline: { year: number; a: number | null; b: number | null }[];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function person(chart: SajuChart, name: string): GunghapPerson {
  const p = chart.pillars;
  const list = [p.year, p.month, p.day, ...(p.hour ? [p.hour] : [])];
  return {
    name,
    gender: chart.input.gender,
    solarDate: chart.solarDate,
    hourKnown: Boolean(p.hour),
    pillars: list.map((x) => ({ label: x.label, stem: x.stem, branch: x.branch, stemElement: x.stemElement, branchElement: x.branchElement })),
    dayMaster: { stem: chart.dayMaster.stem, element: chart.dayMaster.element },
    zodiac: `${p.year.branch}(${BRANCH_ANIMAL[p.year.branch]}띠)`,
    yongsin: chart.analysis.usefulness.yongsin,
    weighted: chart.elements.weighted,
  };
}

/** 일간 오행끼리의 흐름 */
function elementFlow(a: Element, b: Element, an: string, bn: string): { text: string; score: number } {
  if (a === b) return { text: `두 분 모두 ${ELEMENT_KO[a]} 기운이라 결이 같습니다(비화).`, score: 4 };
  if (GENERATES[a] === b) return { text: `${an} 님의 ${ELEMENT_KO[a]}이(가) ${bn} 님의 ${ELEMENT_KO[b]}을(를) 살리는 흐름입니다(상생).`, score: 7 };
  if (GENERATES[b] === a) return { text: `${bn} 님의 ${ELEMENT_KO[b]}이(가) ${an} 님의 ${ELEMENT_KO[a]}을(를) 살리는 흐름입니다(상생).`, score: 7 };
  if (CONTROLS[a] === b) return { text: `${an} 님의 ${ELEMENT_KO[a]}이(가) ${bn} 님의 ${ELEMENT_KO[b]}을(를) 다스리는 흐름입니다(상극). 이끄는 쪽과 맞추는 쪽이 분명합니다.`, score: 1 };
  return { text: `${bn} 님의 ${ELEMENT_KO[b]}이(가) ${an} 님의 ${ELEMENT_KO[a]}을(를) 다스리는 흐름입니다(상극). 이끄는 쪽과 맞추는 쪽이 분명합니다.`, score: 1 };
}

const sumTone = (rs: Relation[], weights: Record<string, number>) => rs.reduce((s, r) => s + (weights[r.name.replace(/\(.*\)/, "")] ?? 0), 0);

/** 상대에게 약한 오행을 내가 넉넉히 가졌는지 */
function gives(from: GunghapPerson, to: GunghapPerson): Element[] {
  const avg = (w: Record<Element, number>) => ELEMENTS.reduce((s, e) => s + w[e], 0) / 5;
  const toAvg = avg(to.weighted);
  const fromAvg = avg(from.weighted);
  return ELEMENTS.filter((e) => to.weighted[e] < toAvg * 0.6 && from.weighted[e] >= fromAvg);
}

const share = (w: Record<Element, number>, e: Element) => w[e] / ELEMENTS.reduce((s, x) => s + w[x], 0);

export function computeGunghap(a: SajuChart, aName: string, b: SajuChart, bName: string, relation: GunghapRelation, now = new Date()): GunghapComputed {
  const A = person(a, aName);
  const B = person(b, bName);

  const dmRel = stemRelation(a.pillars.day.stem, b.pillars.day.stem);
  const flow = elementFlow(A.dayMaster.element, B.dayMaster.element, aName, bName);
  const dayScore = clamp(13 + flow.score + (dmRel.some((r) => r.name.startsWith("천간합")) ? 8 : 0) - (dmRel.some((r) => r.name === "천간충") ? 6 : 0), 3, 25);

  const spRel = branchRelation(a.pillars.day.branch, b.pillars.day.branch);
  const spouseScore = clamp(13 + sumTone(spRel, { 육합: 9, 삼합: 7, 충: -7, 형: -4, 자형: -2, 원진: -4, 해: -3, 파: -1 }), 3, 25);

  const zRel = branchRelation(a.pillars.year.branch, b.pillars.year.branch);
  const zodiacScore = clamp(6 + sumTone(zRel, { 육합: 4, 삼합: 3, 충: -3, 원진: -2, 해: -1, 형: -1 }), 1, 10);

  const aGivesB = gives(A, B);
  const bGivesA = gives(B, A);
  const complementScore = clamp(10 + 5 * (aGivesB.length + bGivesA.length), 5, 25);

  const aToB = Math.round(share(A.weighted, B.yongsin) * 100);
  const bToA = Math.round(share(B.weighted, A.yongsin) * 100);
  const yongsinScore = clamp(Math.round((aToB + bToA) * 0.3), 2, 15);

  const scores = [
    { label: "마음의 결(일간)", score: dayScore, max: 25 },
    { label: relation === "business" ? "함께 일하는 자리(일지)" : "생활의 궁합(배우자 자리)", score: spouseScore, max: 25 },
    { label: "서로 채워 주는 오행", score: complementScore, max: 25 },
    { label: "서로의 용신을 돕는 정도", score: yongsinScore, max: 15 },
    { label: "띠 궁합(년지)", score: zodiacScore, max: 10 },
  ];
  const total = scores.reduce((s, x) => s + x.score, 0);
  const tier =
    total >= 80
      ? { name: "서로를 크게 살리는 인연", desc: "타고난 기운이 서로를 북돋워, 함께할수록 힘이 붙는 궁합입니다." }
      : total >= 65
        ? { name: "맞춰 갈수록 깊어지는 인연", desc: "잘 맞는 결과 다른 결이 함께 있어, 서로를 알아 갈수록 단단해지는 궁합입니다." }
        : total >= 50
          ? { name: "다름을 배워 가는 인연", desc: "서로 다른 점이 분명해, 그 차이를 존중하는 방식을 정해 두면 좋은 짝이 되는 궁합입니다." }
          : { name: "노력으로 길을 내는 인연", desc: "부딪히기 쉬운 결이 있어, 대화의 규칙과 역할 나눔이 특히 중요한 궁합입니다." };

  // 앞으로 30년, 5년 간격으로 두 사람의 대운 점수(용신 부합도)
  const thisYear = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear();
  const at = (c: SajuChart, y: number) => {
    const i = c.daeun.periods.findIndex((p) => y >= p.startYear && y <= p.endYear);
    return i >= 0 ? (c.analysis.daeunScores[i]?.score ?? null) : null;
  };
  const timeline = Array.from({ length: 7 }, (_, i) => thisYear + i * 5).map((y) => ({ year: y, a: at(a, y), b: at(b, y) }));

  return {
    relation,
    a: A,
    b: B,
    dayMaster: { relations: dmRel, flow: flow.text },
    spouse: { relations: spRel, a: a.pillars.day.branch, b: b.pillars.day.branch },
    zodiac: { relations: zRel, a: A.zodiac, b: B.zodiac },
    complement: { aGivesB, bGivesA },
    yongsinHelp: { aToB, bToA },
    scores,
    total,
    tier,
    timeline,
  };
}

const SYSTEM = `당신은 정통 명리학의 궁합법에 밝은 품격 있는 감정가입니다. 유료 궁합 감정서(A4 책자) "연분록(緣分錄)"의 문장을 씁니다.
두 사람의 관계를 점수로 재단하지 말고, 두 명식이 어떻게 서로를 비추고 채우는지를 따뜻하고 구체적으로 풀어 줍니다. 관계를 끝내라거나 맺으라고 권하지 않습니다.
${COMMON_RULES}`;

const el = (e: Element) => ELEMENT_KO[e];
const rel = (rs: Relation[]) => (rs.length ? rs.map((r) => r.name).join(", ") : "뚜렷한 합·충 없음");

export function gunghapPrompt(c: GunghapComputed) {
  const who = (p: GunghapPerson) => ({
    이름: p.name,
    성별: p.gender === "male" ? "남성" : "여성",
    명식: p.pillars.map((x) => `${x.label} ${x.stem}${x.branch}`).join(" / ") + (p.hourKnown ? "" : " (태어난 시각 모름)"),
    일간: `${p.dayMaster.stem} ${el(p.dayMaster.element)}`,
    띠: p.zodiac,
    참고용신: el(p.yongsin),
  });
  return {
    관계: GUNGHAP_RELATIONS[c.relation],
    의뢰인: who(c.a),
    상대: who(c.b),
    일간관계: { 흐름: c.dayMaster.flow, 합충: rel(c.dayMaster.relations) },
    [c.relation === "business" ? "일지관계" : "배우자자리관계"]: `${c.spouse.a}·${c.spouse.b}: ${rel(c.spouse.relations)}`,
    띠관계: `${c.zodiac.a}·${c.zodiac.b}: ${rel(c.zodiac.relations)}`,
    오행보완: {
      [`${c.a.name}→${c.b.name}`]: c.complement.aGivesB.map(el).join(", ") || "뚜렷하지 않음",
      [`${c.b.name}→${c.a.name}`]: c.complement.bGivesA.map(el).join(", ") || "뚜렷하지 않음",
    },
    용신도움: `${c.a.name}의 명식에 ${c.b.name}의 용신 기운 ${c.yongsinHelp.aToB}%, ${c.b.name}의 명식에 ${c.a.name}의 용신 기운 ${c.yongsinHelp.bToA}%`,
    점수: c.scores.map((s) => `${s.label} ${s.score}/${s.max}`).concat(`합계 ${c.total}/100 · ${c.tier.name}`),
    대운동행: c.timeline.map((t) => `${t.year}년 ${c.a.name} ${t.a ?? "-"} / ${c.b.name} ${t.b ?? "-"}`),
  };
}

export type GunghapResult = ExtraResult<GunghapRequest, GunghapComputed, SectionsText>;

export async function generateGunghap(chart: SajuChart, request: GunghapRequest, paidAt: Date): Promise<GunghapResult> {
  const partnerInput: BirthInput = { ...request.partner, ...(chart.input.locale ? { locale: chart.input.locale } : {}) };
  const partner = calculateSaju(partnerInput, paidAt);
  const computed = computeGunghap(chart, chart.input.name?.trim() || "의뢰인", partner, request.partner.name, request.relation, paidAt);
  const business = request.relation === "business";
  const user = `"연분록" 궁합 감정서를 씁니다. 관계: ${GUNGHAP_RELATIONS[request.relation]}.
- summary: 두 사람의 인연을 한 줄로.
- sections: 6개 장, 장마다 2~3개 문단(장당 400~700자). 순서와 제목:
  1) "두 사람의 타고난 기질" — 각자의 일간과 명식이 보여 주는 성향
  2) "마음의 결이 만나는 방식" — 일간 관계(상생·상극·합)로 본 소통과 감정
  3) ${business ? '"함께 일하는 방식" — 일지 관계로 본 역할 나눔과 협업' : '"함께 사는 생활의 궁합" — 배우자 자리(일지) 관계로 본 일상과 살림'}
  4) "서로 채워 주는 기운" — 오행 보완과 용신을 돕는 정도
  5) "함께 걷는 대운의 흐름" — 대운 동행 표로 본 함께 힘을 낼 시기와 서로 받쳐 줄 시기
  6) "인연을 지키는 법" — 긴장 요소(충·원진 등)가 있으면 그것을 다루는 구체적 방법
- advice: 두 사람이 함께 실천할 조언 4~5개.

[궁합 JSON]
${JSON.stringify(gunghapPrompt(computed), null, 2)}`;
  const text = await writeJson({ system: SYSTEM, user, schema: sectionsJsonSchema("궁합 감정서의 장", "6개"), zod: sectionsTextSchema, label: "연분록" });
  return { kind: "gunghap", request, computed, text };
}
