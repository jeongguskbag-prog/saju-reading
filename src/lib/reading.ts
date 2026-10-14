import Anthropic from "@anthropic-ai/sdk";
import { ELEMENT_KO } from "./saju/constants";
import type { LuckPillar, Pillar, SajuChart } from "./saju/calc";
import { readingSchema, SECTION_KEYS, type Reading } from "./reading-shared";

export { SECTION_KEYS, SECTION_TITLES, type Reading } from "./reading-shared";

export const DEFAULT_MODEL = "claude-opus-5-5";

const sectionJsonSchema = {
  type: "object",
  properties: {
    body: { type: "string", description: "본문. 2~4개 문단, 문단 사이는 빈 줄(\\n\\n)." },
    tips: { type: "array", items: { type: "string" }, description: "실천할 수 있는 행동 개운법 2~3개" },
  },
  required: ["body", "tips"],
  additionalProperties: false,
} as const;

const readingJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "이 사주를 한두 문장으로 요약" },
    personality: sectionJsonSchema,
    wealth: sectionJsonSchema,
    love: sectionJsonSchema,
    health: sectionJsonSchema,
    thisYear: sectionJsonSchema,
  },
  required: ["summary", ...SECTION_KEYS],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `당신은 정통 명리학에 밝고, 그 개념을 현대 심리학과 생활 언어로 풀어 설명하는 사주 감정가입니다.

원칙:
- 입력으로 받은 [명식 JSON]만 근거로 씁니다. JSON에 없는 간지·십신·대운을 지어내지 말고, 언급하는 글자와 십신은 JSON의 값과 일치해야 합니다.
- 우아하고 신뢰감 있는 경어체(~합니다)로 씁니다. 단정하기보다 '~한 경향이 있습니다'처럼 경향으로 표현합니다.
- 공포심을 주는 표현(단명, 큰 사고, 이혼수 단정 등)을 쓰지 않습니다. 약점을 말할 때는 반드시 현실적인 행동 개운법을 함께 제시합니다.
- 건강은 오행 균형에 따른 생활 습관 제안까지만 쓰고, 특정 질병을 예언하거나 진단하지 않습니다.
- 각 항목 본문은 근거가 된 명리 요소(예: 일간, 월지 십신, 오행 과다·부족, 현재 대운)를 자연스럽게 짚어 줍니다.
- 신강·신약 점수는 단순 계산된 참고값이므로 단정적인 용신 판단의 근거로 삼지 않습니다.`;

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
  const { pillars } = chart;
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
    신강신약_참고: `${chart.strength.label} (${chart.strength.score}/100)`,
    대운: {
      방향: chart.daeun.forward ? "순행" : "역행",
      목록: chart.daeun.periods.map((p) => `${p.startAge}세~ (${p.startYear}~${p.endYear}) ${luck(p)}`),
      현재대운: chart.daeun.current ? luck(chart.daeun.current) : "대운 시작 전",
    },
    올해: `${chart.yearLuck.year}년 세운 ${luck(chart.yearLuck)}`,
  };
}

export class ReadingError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function generateReading(chart: SajuChart): Promise<Reading> {
  if (!isAiEnabled()) throw new ReadingError("ANTHROPIC_API_KEY가 설정되지 않았습니다.", 503);

  const client = new Anthropic();
  const userContent = `다음 명식으로 항목별 사주 풀이를 작성해 주세요. 각 항목 본문은 한국어 500~800자 분량입니다.

[명식 JSON]
${JSON.stringify(chartForPrompt(chart), null, 2)}`;

  let message;
  try {
    message = await client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // 안전 분류기가 요청을 거절하면 서버에서 대체 모델로 자동 재시도한다.
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: readingJsonSchema } },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new ReadingError("API 키가 올바르지 않습니다.", 502);
    if (error instanceof Anthropic.RateLimitError) throw new ReadingError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
    if (error instanceof Anthropic.APIError) throw new ReadingError(`AI 호출 오류(${error.status ?? "네트워크"}).`, 502);
    throw error;
  }

  if (message.stop_reason === "refusal") throw new ReadingError("AI가 이 요청에 대한 풀이를 생성하지 못했습니다.", 502);
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
  const result = readingSchema.safeParse(parsed);
  if (!result.success) throw new ReadingError("AI 응답 형식이 올바르지 않습니다.", 502);
  return result.data;
}
