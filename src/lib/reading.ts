import Anthropic from "@anthropic-ai/sdk";
import { TEN_GOD_MODERN } from "./saju/analysis";
import { ELEMENT_KO } from "./saju/constants";
import type { LuckPillar, Pillar, SajuChart } from "./saju/calc";
import {
  CHAPTERS,
  chapterSchema,
  introSchema,
  withYears,
  type ChapterKey,
  type PartKey,
  type PartResult,
} from "./report-shared";

export const DEFAULT_MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `당신은 정통 명리학에 밝고, 그 개념을 현대 심리학과 비즈니스·생활 언어로 풀어 설명하는 품격 있는 사주 감정가입니다. 유료 감정서(A4 책자)의 한 파트를 집필합니다.

원칙:
- 입력으로 받은 [명식 JSON]만 근거로 씁니다. JSON에 없는 간지·십신·대운·격국·용신을 지어내지 말고, 언급하는 값은 JSON과 일치해야 합니다. 격국과 참고 용신은 JSON의 값을 그대로 씁니다.
- 고전 용어를 나열하지 말고 현대적 표현으로 풀어 씁니다. 십신은 [십신 현대어] 표의 표현을 우선 쓰고, 필요하면 괄호로 원래 용어를 덧붙입니다. 예: "프로젝트형 수익 창출력(편재)".
- 우아하고 신뢰감 있는 경어체(~합니다)로 씁니다. 단정하기보다 '~한 경향이 있습니다'처럼 경향으로 표현합니다.
- 공포심을 주는 표현(흉살 때문에 망한다, 단명, 큰 사고, 이혼수 단정 등)을 쓰지 않습니다. 약점은 반드시 구체적인 행동 개운법(Action Plan)과 함께 제시합니다.
- 건강은 오행 균형에 따른 생활 습관 제안까지만 쓰고, 특정 질병을 예언하거나 진단하지 않습니다. 투자 종목·시점 같은 구체적 금융 조언은 하지 않습니다.
- 의뢰인의 구체적인 경험이나 사건을 지어내지 않습니다.
- 각 파트의 다른 파트와 내용이 겹치지 않도록, 지시된 소제목의 범위 안에서만 씁니다.`;

function pillarSummary(p: Pillar | null) {
  if (!p) return null;
  return {
    간지: `${p.stem}${p.branch}(${p.stemKo}${p.branchKo})`,
    천간: { 글자: p.stem, 오행: ELEMENT_KO[p.stemElement], 십신: p.stemTenGod ?? "일간(본인)" },
    지지: { 글자: p.branch, 오행: ELEMENT_KO[p.branchElement], 십신: p.branchTenGod },
    지장간: p.hiddenStems.map((h) => `${h.stem}(${h.tenGod})`).join(", "),
  };
}

const luck = (l: LuckPillar) => `${l.stem}${l.branch}(${l.ko}) 천간 ${l.stemTenGod} / 지지 ${l.branchTenGod}`;

/** AI에 넘길 명식 데이터. 이름 등 개인 식별 정보는 넣지 않는다. */
export function chartForPrompt(chart: SajuChart) {
  const { pillars, analysis: a } = chart;
  const u = a.usefulness;
  return {
    성별: chart.input.gender === "male" ? "남성" : "여성",
    출생연도: Number(chart.solarDate.slice(0, 4)),
    태어난시각: pillars.hour ? "앎" : "모름(시주 제외)",
    원국: {
      년주: pillarSummary(pillars.year),
      월주: pillarSummary(pillars.month),
      일주: pillarSummary(pillars.day),
      시주: pillarSummary(pillars.hour),
    },
    일간: `${chart.dayMaster.stem}(${chart.dayMaster.ko}) ${ELEMENT_KO[chart.dayMaster.element]} ${chart.dayMaster.polarity === "yang" ? "양" : "음"}`,
    오행개수: Object.fromEntries(Object.entries(chart.elements.counts).map(([k, v]) => [ELEMENT_KO[k as keyof typeof ELEMENT_KO], v])),
    십신분포: chart.tenGodCounts,
    신강신약: `${chart.strength.label} (${chart.strength.score}/100, 참고값)`,
    격국: `${a.gyeokguk.name} (${a.gyeokguk.basis})`,
    참고용신: `${ELEMENT_KO[u.yongsin]} / 희신 ${ELEMENT_KO[u.huisin]} / 기신 ${ELEMENT_KO[u.gisin]} (${u.method})`,
    대운: {
      방향: chart.daeun.forward ? "순행" : "역행",
      목록: chart.daeun.periods.map(
        (p, i) => `${p.startAge}세~ (${p.startYear}~${p.endYear}) ${luck(p)} · 용신 부합도 ${a.daeunScores[i]?.score ?? "-"}/100`,
      ),
      현재대운: chart.daeun.current ? luck(chart.daeun.current) : "대운 시작 전",
    },
    세운: a.yearScores.map((y) => `${y.year}년 ${y.ganzhi} · 용신 부합도 ${y.score}/100`),
    월별흐름: a.monthly.map(
      (m) => `${m.year}년 절입 ${m.startDate.slice(5)}~ ${m.stem}${m.branch} (${m.stemTenGod}/${m.branchTenGod}) ${m.mark}`,
    ),
    사주등급: `${chart.grade.tier.level}등급 ${chart.grade.tier.name} (상위 ${chart.grade.topPercent}%, ${chart.grade.score}/100) · 대운 전성기 ${chart.grade.peak ? `${chart.grade.peak.startAge}~${chart.grade.peak.endAge}세` : "-"} · 귀인 ${chart.grade.nobles.filter((n) => n.has).map((n) => n.name).join(", ") || "없음"}`,
    개운요소: { 오행: ELEMENT_KO[a.lucky.element], 색상: a.lucky.colors, 숫자: a.lucky.numbers, 방위: a.lucky.direction, 습관: a.lucky.habits },
  };
}

const TEN_GOD_TABLE = Object.entries(TEN_GOD_MODERN)
  .map(([g, m]) => `- ${g}: ${m}`)
  .join("\n");

const chapterJsonSchema = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          paragraphs: { type: "array", items: { type: "string" } },
        },
        required: ["heading", "paragraphs"],
        additionalProperties: false,
      },
    },
    actionPlan: { type: "array", items: { type: "string" }, description: "이 파트의 실천 개운법 3~5개, 각 한 문장" },
  },
  required: ["sections", "actionPlan"],
  additionalProperties: false,
};

const introJsonSchema = {
  type: "object",
  properties: {
    coverKeywords: { type: "array", items: { type: "string" }, description: "이 사람을 표현하는 키워드 3개, 각 2~6자" },
    summary: { type: "string", description: "명식 전체를 한두 문장으로 요약" },
    preface: { type: "array", items: { type: "string" }, description: "발간사 3~4개 문단" },
  },
  required: ["coverKeywords", "summary", "preface"],
  additionalProperties: false,
};

function partInstruction(part: PartKey, years: [number, number]): string {
  if (part === "intro") {
    return `감정서 첫머리를 작성합니다.
- coverKeywords: 표지에 들어갈 이 사람의 핵심 키워드 3개(예: "따뜻한 리더", "깊은 직관").
- summary: 명식 전체 요약 한두 문장.
- preface: 의뢰인에게 건네는 발간사 3~4개 문단(총 600~900자). 이 감정서를 어떻게 읽고 활용하면 좋은지, 명식의 큰 인상을 담되 본문 파트의 세부 내용은 미리 쓰지 않습니다.`;
  }
  const meta = CHAPTERS[part];
  const headings = meta.sections.map((s, i) => `${i + 1}. ${withYears(s, years)}`).join("\n");
  return `${meta.label}. ${withYears(meta.title, years)} 파트를 작성합니다. (${meta.lead})
sections는 아래 소제목을 이 순서, 이 문구 그대로 heading으로 쓰고, 소제목마다 3~5개 문단(문단당 200~350자)으로 씁니다. 파트 전체 분량은 한국어 약 3,500~5,000자입니다.
${headings}
actionPlan: 이 파트 내용에 맞는 실천 개운법 3~5개.`;
}

export class ReadingError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
  }
}

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function generatePart(chart: SajuChart, part: PartKey): Promise<PartResult> {
  if (!isAiEnabled()) throw new ReadingError("ANTHROPIC_API_KEY가 설정되지 않았습니다.", 503);

  const years = chart.analysis.reportYears;
  const userContent = `${partInstruction(part, years)}

[십신 현대어]
${TEN_GOD_TABLE}

[명식 JSON]
${JSON.stringify(chartForPrompt(chart), null, 2)}`;

  const client = new Anthropic();
  let message;
  try {
    message = await client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // 안전 분류기가 요청을 거절하면 서버에서 대체 모델로 자동 재시도한다.
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: part === "intro" ? introJsonSchema : chapterJsonSchema },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new ReadingError("API 키가 올바르지 않습니다.", 502);
    if (error instanceof Anthropic.RateLimitError) throw new ReadingError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
    if (error instanceof Anthropic.APIError) throw new ReadingError(`AI 호출 오류(${error.status ?? "네트워크"}).`, 502);
    throw error;
  }

  if (message.stop_reason === "refusal") throw new ReadingError("AI가 이 파트의 풀이를 생성하지 못했습니다.", 502);
  if (message.stop_reason === "max_tokens") throw new ReadingError("풀이가 너무 길어 중간에 끊겼습니다. 다시 시도해 주세요.", 502);

  const text = message.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ReadingError("AI 응답을 해석하지 못했습니다.", 502);
  }

  if (part === "intro") {
    const r = introSchema.safeParse(parsed);
    if (!r.success) throw new ReadingError("AI 응답 형식이 올바르지 않습니다.", 502);
    return { part, intro: r.data };
  }
  const r = chapterSchema.safeParse(parsed);
  if (!r.success) throw new ReadingError("AI 응답 형식이 올바르지 않습니다.", 502);
  return { part: part as ChapterKey, chapter: r.data };
}
