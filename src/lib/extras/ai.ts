// 추가 상품의 AI 문장 쓰기(서버 전용). 계산값은 엔진이 정하고 AI는 그 값을 근거로 문장만 쓴다.
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { DEFAULT_MODEL, ReadingError, isAiEnabled } from "../reading";

/** 모든 추가 상품에 공통으로 붙는 원칙 */
export const COMMON_RULES = `공통 원칙:
- 입력으로 받은 JSON의 계산값만 근거로 씁니다. JSON에 없는 간지·괘·별·날짜·점수를 지어내지 않고, 언급하는 값은 JSON과 일치해야 합니다.
- 우아하고 신뢰감 있는 경어체(~합니다)로 씁니다. 단정하지 말고 '~한 경향이 있습니다', '~하기 좋은 흐름입니다'처럼 씁니다.
- 공포심을 주는 표현(파혼한다, 망한다, 큰 사고, 단명, 이혼수 단정 등)을 쓰지 않습니다. 긴장 요소는 반드시 구체적인 행동 조언과 함께 제시합니다.
- 건강은 생활 습관 제안까지만 쓰고 질병을 예언하거나 진단하지 않습니다. 투자 종목·시점 같은 구체적 금융 조언은 하지 않습니다.
- 의뢰인의 구체적인 사연이나 사건을 지어내지 않습니다.
- 결과를 보장하지 않습니다. 전통 술수에 바탕을 둔 참고 자료이며 결정은 의뢰인의 몫임을 존중합니다.`;

export async function writeJson<T>(opts: { system: string; user: string; schema: Record<string, unknown>; zod: z.ZodType<T>; label: string; maxTokens?: number }): Promise<T> {
  if (!isAiEnabled()) throw new ReadingError("ANTHROPIC_API_KEY가 설정되지 않았습니다.", 503);
  const client = new Anthropic();
  let message;
  try {
    message = await client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: opts.schema } },
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new ReadingError("API 키가 올바르지 않습니다.", 502);
    if (error instanceof Anthropic.RateLimitError) throw new ReadingError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
    if (error instanceof Anthropic.APIError) throw new ReadingError(`AI 호출 오류(${error.status ?? "네트워크"}).`, 502);
    throw error;
  }
  if (message.stop_reason === "refusal") throw new ReadingError(`AI가 ${opts.label} 문장을 생성하지 못했습니다.`, 502);
  if (message.stop_reason === "max_tokens") throw new ReadingError("문장이 너무 길어 중간에 끊겼습니다. 다시 시도해 주세요.", 502);
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
  const r = opts.zod.safeParse(parsed);
  if (!r.success) throw new ReadingError("AI 응답 형식이 올바르지 않습니다.", 502);
  return r.data;
}

/** 섹션형 문장(여러 장 × 문단) — 대부분의 추가 상품이 이 모양을 쓴다. */
export const sectionsJsonSchema = (desc: string, count: string) => ({
  type: "object",
  properties: {
    summary: { type: "string", description: "맨 앞 한 줄 요약(40~80자)" },
    sections: {
      type: "array",
      description: `${desc} (${count})`,
      items: {
        type: "object",
        properties: { heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } } },
        required: ["heading", "paragraphs"],
        additionalProperties: false,
      },
    },
    advice: { type: "array", items: { type: "string" }, description: "실천 조언 3~5개, 한 줄씩" },
  },
  required: ["summary", "sections", "advice"],
  additionalProperties: false,
});
