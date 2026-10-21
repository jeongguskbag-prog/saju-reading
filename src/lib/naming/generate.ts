// 작명록 문장 쓰기(서버 전용). 이름·획수·오행은 엔진이 정하고, AI는 그 값을 근거로 풀이 문장만 쓴다.
import Anthropic from "@anthropic-ai/sdk";
import type { SajuChart } from "../saju/calc";
import { ELEMENT_KO, type Element } from "../saju/constants";
import { DEFAULT_MODEL, ReadingError, isAiEnabled } from "../reading";
import { namingTextSchema, type NamingResultData } from "../report-shared";
import { computeNaming, FEELING_LABEL, type NameAnalysis, type NamingRequest } from "./engine";
import { recordUsage } from "../ai-usage";

const SYSTEM = `당신은 정통 성명학(수리·자원오행·발음오행)과 명리학에 밝은 품격 있는 작명가입니다. 유료 작명 감정서(A4 책자) "길운 개운 작명록"의 문장을 씁니다.

원칙:
- 입력으로 받은 [작명 JSON]만 근거로 씁니다. 이름, 한자, 획수, 수리 번호와 길흉, 오행 값은 JSON 그대로 쓰고 바꾸거나 새로 지어내지 않습니다. 새로운 이름 후보를 추가하지 않습니다.
- 한자의 뜻은 JSON의 "뜻"을 우선 씁니다. 뜻이 비어 있는 글자는 그 한자의 널리 알려진 대표 뜻으로만 짧게 풀고, 확실하지 않으면 뜻풀이를 생략합니다.
- 우아하고 따뜻한 경어체(~합니다)로 씁니다. 단정 대신 '~한 기운을 북돋습니다', '~하기를 바라는 뜻을 담았습니다'처럼 씁니다.
- 공포심을 주는 표현(이름 때문에 불행해진다, 단명, 큰 사고 등)을 쓰지 않습니다. 개명 의뢰의 지금 이름도 깎아내리지 말고, 보완할 점 위주로 정중하게 씁니다.
- 건강·질병을 예언하지 않고, 법률 절차는 일반적인 안내까지만 씁니다.
- 의뢰인의 구체적인 사연을 지어내지 않습니다.`;

const jsonSchema = {
  type: "object",
  properties: {
    intro: { type: "array", items: { type: "string" }, description: "머리글 2~3개 문단: 사주에서 이름으로 보완할 기운과 이번 작명의 방향" },
    names: {
      type: "array",
      description: "추천 이름마다 하나씩, JSON의 순서 그대로",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "이름을 한 줄로 표현한 부제(10~25자)" },
          story: { type: "array", items: { type: "string" }, description: "2~3개 문단: 한자 뜻이 어우러진 이름의 의미, 사주 보완(자원오행), 수리 흐름과 부르는 소리" },
        },
        required: ["title", "story"],
        additionalProperties: false,
      },
    },
    hangul: { type: "array", items: { type: "string" }, description: "순한글 이름마다 한 문단, JSON의 순서 그대로" },
    current: { type: "array", items: { type: "string" }, description: "개명일 때 지금 이름 풀이 1~2개 문단. 작명이면 빈 배열" },
    guide: { type: "array", items: { type: "string" }, description: "맺음말 2개 문단: 다섯 이름 가운데 고르는 법, 출생신고(또는 개명 신청) 때 확인할 점" },
  },
  required: ["intro", "names", "hangul", "current", "guide"],
  additionalProperties: false,
};

const el = (e: Element | null) => (e ? ELEMENT_KO[e] : "-");
const ROLE: Record<string, string> = { yongsin: "용신 보완", huisin: "희신 보완", missing: "부족한 오행 보완", gisin: "기신", neutral: "중립" };

function nameForPrompt(n: NameAnalysis) {
  return {
    이름: `${n.full} (${n.surname.map((c) => c.char).join("")}${n.chars.map((c) => c.char).join("")})`,
    글자: n.chars.map((c) => ({
      한자: c.char,
      음: c.reading,
      뜻: c.meaning ?? "",
      원획: c.strokes || "모름",
      자원오행: el(c.element),
      발음오행: el(c.sound),
      음양: c.strokes ? (c.yang ? "양" : "음") : "모름",
    })),
    수리: n.grids.map((g) => `${g.label} ${g.number}수 ${g.lucky ? "길" : "흉"}(${g.gloss}) · ${g.period}`),
    발음흐름: n.soundFlow.map((s) => `${el(s.from)}→${el(s.to)} ${s.relation}`).join(", "),
    음양조화: n.yinYangMixed ? "음양이 섞여 조화로움" : "음양이 한쪽으로 치우침",
    사주보완: n.fit.map((f) => `${el(f.element)}: ${ROLE[f.role]}`).join(", "),
  };
}

export function namingPrompt(chart: SajuChart, req: NamingRequest, computed: ReturnType<typeof computeNaming>) {
  const b = computed.basis;
  return {
    의뢰: req.mode === "baby" ? "아기 이름 짓기(작명)" : "개명",
    성별: b.gender === "male" ? "남성" : "여성",
    성씨: `${req.surname}(${req.surnameHanja})`,
    돌림자: req.generation ? `${req.generation.hanja}(${req.generation.reading}) ${req.generation.position === "first" ? "첫째" : "둘째"} 자리` : "없음",
    원하는느낌: req.feelings.map((f) => FEELING_LABEL[f]).join(", ") || "없음",
    사주: {
      일간: `${chart.dayMaster.stem}(${ELEMENT_KO[chart.dayMaster.element]})`,
      신강신약: chart.strength.label,
      참고용신: ELEMENT_KO[b.yongsin],
      희신: ELEMENT_KO[b.huisin],
      기신: ELEMENT_KO[b.gisin],
      원국에없는오행: b.missing.map((e) => ELEMENT_KO[e]).join(", ") || "없음",
    },
    추천이름: computed.candidates.map(nameForPrompt),
    순한글이름: computed.hangulNames.map((h) => ({ 이름: `${req.surname}${h.name}`, 뜻: h.meaning, 발음흐름: h.soundFlow.join(", ") })),
    ...(computed.current ? { 지금이름: nameForPrompt(computed.current) } : {}),
    참고: computed.relaxed ? "돌림자 때문에 네 격을 모두 길수로 맞추지 못한 이름이 있어, 세 격 이상 길수인 이름까지 골랐다." : "",
  };
}

export async function generateNaming(chart: SajuChart, req: NamingRequest): Promise<NamingResultData> {
  if (!isAiEnabled()) throw new ReadingError("ANTHROPIC_API_KEY가 설정되지 않았습니다.", 503);
  const computed = computeNaming(chart, req);
  const userContent = `"길운 개운 작명록"의 문장을 작성합니다. 추천 이름 ${computed.candidates.length}개, 순한글 이름 ${computed.hangulNames.length}개입니다.
- intro: 머리글 2~3개 문단(총 500~800자).
- names: 추천 이름마다 title과 story(2~3개 문단, 이름당 500~800자). JSON 순서 그대로 ${computed.candidates.length}개.
- hangul: 순한글 이름마다 한 문단(150~250자). JSON 순서 그대로 ${computed.hangulNames.length}개.
- current: ${computed.current ? "지금 이름의 수리·오행을 정중하게 풀고 새 이름이 무엇을 보완하는지 1~2개 문단." : "빈 배열."}
- guide: 맺음말 2개 문단. ${req.mode === "baby" ? "출생신고 때는 인명용 한자인지 대법원 전자가족관계등록시스템에서 한 번 더 확인하도록 안내" : "개명은 가정법원의 허가가 필요하다는 일반 안내"}.

[작명 JSON]
${JSON.stringify(namingPrompt(chart, req, computed), null, 2)}`;

  const client = new Anthropic();
  let message;
  try {
    message = await client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: jsonSchema } },
      system: SYSTEM,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new ReadingError("API 키가 올바르지 않습니다.", 502);
    if (error instanceof Anthropic.RateLimitError) throw new ReadingError("요청이 많습니다. 잠시 후 다시 시도해 주세요.", 429);
    if (error instanceof Anthropic.APIError) throw new ReadingError(`AI 호출 오류(${error.status ?? "네트워크"}).`, 502);
    throw error;
  }
  await recordUsage(message.usage, message.model, "free");
  if (message.stop_reason === "refusal") throw new ReadingError("AI가 작명록 문장을 생성하지 못했습니다.", 502);
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
  const r = namingTextSchema.safeParse(parsed);
  if (!r.success || r.data.names.length !== computed.candidates.length) throw new ReadingError("AI 응답 형식이 올바르지 않습니다.", 502);
  // 순한글 문단 수가 다르면 맞춰 자른다(없으면 이름 뜻만 보여 준다).
  const hangul = computed.hangulNames.map((_, i) => r.data.hangul[i] ?? "");
  return { request: req, computed, text: { ...r.data, hangul } };
}
