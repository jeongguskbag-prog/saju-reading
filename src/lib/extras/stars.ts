// 재물운·커리어 숏 감정서: 십신(재성·관성 등)의 수와 위치, 앞으로 3년 세운과 대운에서 그 별이 들어오는 때를 계산하고,
// AI는 이 계산값을 근거로 짧은 문장만 쓴다. (연애운 숏 감정서와 같은 틀)
import type { SajuChart } from "../saju/calc";
import { branchTenGod, tenGod, yearGanZhi } from "../saju/gods";
import { ELEMENT_KO, type Branch, type Stem, type TenGod } from "../saju/constants";
import { COMMON_RULES, sectionsJsonSchema, writeJson } from "./ai";
import { sectionsTextSchema } from "./text";
import type { ExtraResult, SectionsText } from "./kinds";

export type StarKind = "money" | "career";

interface StarGroup {
  name: string;
  gods: TenGod[];
}

/** 상품별로 보는 별(십신 묶음) */
const SPEC: Record<StarKind, { main: StarGroup; support: StarGroup; rival: StarGroup; label: string }> = {
  // 재물: 재성이 돈, 식상이 돈을 만드는 힘(식상생재), 비겁이 재물을 나눠 가는 힘(군겁쟁재)
  money: {
    label: "재물운 숏 감정서",
    main: { name: "재성(財星)", gods: ["정재", "편재"] },
    support: { name: "식상(食傷)", gods: ["식신", "상관"] },
    rival: { name: "비겁(比劫)", gods: ["비견", "겁재"] },
  },
  // 커리어: 관성이 직장·명예, 인성이 자격·배움(관인상생), 상관이 규칙과 부딪히는 힘(상관견관)
  career: {
    label: "커리어 숏 감정서",
    main: { name: "관성(官星)", gods: ["정관", "편관"] },
    support: { name: "인성(印星)", gods: ["정인", "편인"] },
    rival: { name: "상관(傷官)", gods: ["상관"] },
  },
};

const PILLAR_KO = { year: "연주(초년·뿌리)", month: "월주(청년·사회)", day: "일주(나·배우자)", hour: "시주(말년·결실)" } as const;

export interface StarTiming {
  label: string;
  ganzhi: string;
  reasons: string[];
}

export interface StarComputed {
  kind: StarKind;
  dayMaster: { stem: Stem; element: string };
  strength: string;
  yongsin: string;
  gyeokguk: string;
  main: { name: string; count: number; where: string[] };
  support: { name: string; count: number };
  rival: { name: string; count: number };
  /** 앞으로 3년 중 별이 들어오는 해 */
  years: StarTiming[];
  /** 지금과 다음 대운에서 별이 들어오는지 */
  daeun: StarTiming[];
}

const count = (chart: SajuChart, gods: TenGod[]) => gods.reduce((s, g) => s + (chart.tenGodCounts[g] ?? 0), 0);

export function computeStars(chart: SajuChart, kind: StarKind, now = new Date()): StarComputed {
  const spec = SPEC[kind];
  const dayStem = chart.pillars.day.stem as Stem;
  const where: string[] = [];
  for (const key of ["year", "month", "day", "hour"] as const) {
    const p = chart.pillars[key];
    if (!p) continue;
    const gods = [key === "day" ? null : tenGod(dayStem, p.stem as Stem), branchTenGod(dayStem, p.branch as Branch)];
    if (gods.some((g) => g && spec.main.gods.includes(g))) where.push(PILLAR_KO[key]);
  }
  const reasons = (stem: Stem, branch: Branch): string[] => {
    const r: string[] = [];
    const sg = tenGod(dayStem, stem);
    const bg = branchTenGod(dayStem, branch);
    if (spec.main.gods.includes(sg)) r.push(`천간에 ${spec.main.name.slice(0, 2)}(${sg})`);
    if (spec.main.gods.includes(bg)) r.push(`지지에 ${spec.main.name.slice(0, 2)}(${bg})`);
    if (spec.support.gods.includes(sg) || spec.support.gods.includes(bg)) r.push(`${spec.support.name.slice(0, 2)}이 받쳐 줌`);
    return r;
  };
  const kYear = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear();
  const years: StarTiming[] = [];
  for (let y = kYear; y < kYear + 3; y++) {
    const [s, b] = yearGanZhi(y) as [Stem, Branch];
    const r = reasons(s, b);
    if (r.length) years.push({ label: `${y}년`, ganzhi: s + b, reasons: r });
  }
  const periods = chart.daeun.periods;
  const cur = periods.findIndex((p) => p.startYear <= kYear && kYear <= p.endYear);
  const daeun: StarTiming[] = [];
  for (const p of periods.slice(Math.max(cur, 0), Math.max(cur, 0) + 2)) {
    const r = reasons(p.stem, p.branch);
    daeun.push({ label: `${p.startYear}~${p.endYear}년 대운`, ganzhi: p.stem + p.branch, reasons: r.length ? r : ["뚜렷하지 않음"] });
  }
  return {
    kind,
    dayMaster: { stem: dayStem, element: ELEMENT_KO[chart.dayMaster.element] },
    strength: chart.strength.label,
    yongsin: ELEMENT_KO[chart.analysis.usefulness.yongsin],
    gyeokguk: chart.analysis.gyeokguk.name,
    main: { name: spec.main.name, count: count(chart, spec.main.gods), where },
    support: { name: spec.support.name, count: count(chart, spec.support.gods) },
    rival: { name: spec.rival.name, count: count(chart, spec.rival.gods) },
    years,
    daeun,
  };
}

export const STAR_LABEL: Record<StarKind, string> = { money: SPEC.money.label, career: SPEC.career.label };

const SECTIONS: Record<StarKind, string> = {
  money: `1) "나의 돈 그릇" — 재성의 수와 자리, 신강약으로 보는 돈을 다루는 방식(모으는 형/굴리는 형 등)
  2) "돈이 들어오는 길" — 식상(재주·활동)이 재성을 받쳐 주는지, 어떤 방식으로 벌 때 잘 맞는지
  3) "돈이 새는 길" — 비겁(경쟁·동업·지출)과의 관계, 조심할 습관
  4) "재물이 드는 때" — 앞으로 3년과 지금·다음 대운의 근거(없으면 기반을 다지는 시기로)`,
  career: `1) "나의 일하는 방식" — 격국·관성·인성으로 보는 조직형/독립형, 맞는 역할
  2) "잘 맞는 일의 결" — 십신의 조합으로 보는 직무·분야의 방향(특정 회사·직업을 단정하지 말 것)
  3) "부딪히기 쉬운 지점" — 상관과 관성의 관계, 윗사람·규칙과의 관계에서 조심할 점
  4) "일이 풀리는 때" — 앞으로 3년과 지금·다음 대운의 근거(없으면 실력을 쌓는 시기로)`,
};

const SYSTEM = (kind: StarKind) => `당신은 정통 명리학으로 ${kind === "money" ? "재물운" : "직업·커리어"}을 읽는 품격 있는 감정가입니다. 짧은 유료 감정서 "${STAR_LABEL[kind]}"의 문장을 씁니다.
계산값(십신의 수와 자리, 세운·대운)을 근거로 "원인(명리 구조) → 결과(생활 속 모습) → 행동"의 순서로 구체적으로 풀어 줍니다.
${kind === "money" ? "투자 종목·금액을 권하거나 수익을 약속하지 않습니다. 대출·투자 결정은 본인이 판단하도록 합니다." : "이직·퇴사를 단정하거나 권하지 않고, 특정 회사·직업을 정해 주지 않습니다."}
${COMMON_RULES}`;

export type StarResult = ExtraResult<Record<string, never>, StarComputed, SectionsText>;

export async function generateStars(chart: SajuChart, kind: StarKind, paidAt: Date): Promise<StarResult> {
  const c = computeStars(chart, kind, paidAt);
  const p = chart.pillars;
  const data = {
    명식: [p.year, p.month, p.day, p.hour].filter(Boolean).map((x) => `${x!.label} ${x!.stem}${x!.branch}`).join(" / ") + (p.hour ? "" : " (시각 모름)"),
    일간: `${c.dayMaster.stem} ${c.dayMaster.element}`,
    신강약: c.strength,
    격국: c.gyeokguk,
    참고용신: c.yongsin,
    주요별: `${c.main.name} ${c.main.count}개${c.main.where.length ? ` (${c.main.where.join(", ")})` : ""}`,
    받쳐주는별: `${c.support.name} ${c.support.count}개`,
    견제하는별: `${c.rival.name} ${c.rival.count}개`,
    앞으로3년: c.years.length ? c.years.map((y) => `${y.label} ${y.ganzhi}: ${y.reasons.join(", ")}`) : ["뚜렷한 해 없음"],
    대운: c.daeun.map((d) => `${d.label} ${d.ganzhi}: ${d.reasons.join(", ")}`),
  };
  const user = `"${STAR_LABEL[kind]}"를 씁니다. 짧고 핵심만, 전체 2,000~2,800자.
- summary: 한 줄 요약.
- sections: 4개 장, 장마다 2개 문단(장당 300~500자). 순서와 제목:
  ${SECTIONS[kind]}
- advice: 실천 3~4개.

[계산값 JSON]
${JSON.stringify(data, null, 2)}`;
  const text = await writeJson({
    system: SYSTEM(kind),
    user,
    schema: sectionsJsonSchema(`${STAR_LABEL[kind]}의 장`, "4개"),
    zod: sectionsTextSchema,
    label: STAR_LABEL[kind],
    maxTokens: 8000,
  });
  return { kind, request: {}, computed: c, text };
}
