import Anthropic from "@anthropic-ai/sdk";
import {
  addTurn,
  clearTurns,
  consultMessages,
  consultModel,
  consultSystem,
  getTurns,
  QUESTION_MAX_CHARS,
  QUESTIONS_PER_HOUR,
  questionsLeft,
  refundQuestion,
  takeQuestion,
} from "@/lib/consult";
import { getMember, memberFromRequest, type Member } from "@/lib/member";
import { isAiEnabled, isAppRequest } from "@/lib/reading";
import { calculateSaju } from "@/lib/saju/calc";
import { getStore } from "@/lib/store";
import { recordUsage } from "@/lib/ai-usage";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

function profileOf(m: Member, id: string | null) {
  return m.profiles.find((p) => p.id === id) ?? null;
}

/** 대화 기록과 남은 질문권: ?profileId= */
export async function GET(request: Request) {
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return json({ error: "로그인이 필요합니다." }, 401);
  const p = profileOf(m, new URL(request.url).searchParams.get("profileId"));
  if (!p) return json({ error: "저장한 사주를 찾지 못했습니다." }, 404);
  return json({ turns: await getTurns(m.id, p.id), left: questionsLeft(m) });
}

/** 대화 지우기: ?profileId= */
export async function DELETE(request: Request) {
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return json({ error: "로그인이 필요합니다." }, 401);
  const p = profileOf(m, new URL(request.url).searchParams.get("profileId"));
  if (!p) return json({ error: "저장한 사주를 찾지 못했습니다." }, 404);
  await clearTurns(m.id, p.id);
  return new Response(null, { status: 204 });
}

/**
 * 질문하기: { profileId, question } → 답을 한 줄짜리 JSON 조각으로 흘려보낸다.
 * {"t":"d","v":"글자"} … {"t":"done","left":남은 질문권} 또는 {"t":"error","message":"…"}
 */
export async function POST(request: Request) {
  if (!isAiEnabled()) return json({ error: "AI 상담을 잠시 쓸 수 없습니다." }, 503);
  const m = await memberFromRequest(request).catch(() => null);
  if (!m) return json({ error: "카카오로 로그인하면 AI 상담을 이용할 수 있습니다." }, 401);
  const body = (await request.json().catch(() => null)) as { profileId?: unknown; question?: unknown } | null;
  const p = profileOf(m, typeof body?.profileId === "string" ? body.profileId : null);
  if (!p) return json({ error: "질문할 사주를 골라 주세요. 마이에 사주를 먼저 저장해야 합니다." }, 400);
  const question = String(body?.question ?? "").trim();
  if (question.length < 2) return json({ error: "질문을 적어 주세요." }, 400);
  if (question.length > QUESTION_MAX_CHARS) return json({ error: `질문은 ${QUESTION_MAX_CHARS}자까지 적을 수 있습니다.` }, 400);

  const hour = new Date().toISOString().slice(0, 13);
  if (((await getStore()?.incr(`consult-rate:${m.id}:${hour}`, 3600)) ?? 0) > QUESTIONS_PER_HOUR) {
    return json({ error: "질문이 너무 많습니다. 잠시 뒤 다시 질문해 주세요." }, 429);
  }
  // 천기록 앱(사장님용)은 질문권을 쓰지 않는다.
  const owner = isAppRequest(request.headers.get("x-app-key"));
  const spent = owner ? null : await takeQuestion(m.id);
  if (!owner && !spent) return json({ error: "남은 질문권이 없습니다. 질문권을 구매하면 이어서 질문할 수 있습니다.", needPurchase: true }, 402);
  const refund = () => (spent ? refundQuestion(m.id, spent) : Promise.resolve());

  const now = new Date();
  const chart = calculateSaju(p.input, now);
  const history = await getTurns(m.id, p.id);
  const client = new Anthropic();
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      let answer = "";
      try {
        const ai = client.beta.messages.stream({
          model: consultModel(),
          max_tokens: 8000,
          betas: ["server-side-fallback-2026-07-01"],
          // 안전 분류기가 거절하면 서버에서 대체 모델로 자동 재시도한다.
          fallbacks: "default",
          output_config: { effort: "medium" },
          system: consultSystem(chart),
          messages: consultMessages(history, question, now),
        });
        for await (const event of ai) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            answer += event.delta.text;
            send({ t: "d", v: event.delta.text });
          }
        }
        const final = await ai.finalMessage();
        await recordUsage(final.usage, final.model, "consult");
        if (final.stop_reason === "refusal" || !answer.trim()) {
          await refund();
          send({ t: "error", message: "이 질문에는 답을 드리기 어렵습니다. 질문권은 되돌려 드렸습니다. 사주와 관련된 다른 질문을 해 주세요." });
        } else {
          await addTurn(m.id, p.id, { q: question, a: answer.trim(), at: now.toISOString() });
          const after = await getMember(m.id);
          send({ t: "done", left: after ? questionsLeft(after) : 0 });
        }
      } catch (error) {
        console.error("AI 상담 실패", error);
        await refund();
        const busy = error instanceof Anthropic.RateLimitError || (error instanceof Anthropic.APIError && (error.status ?? 0) >= 500);
        send({ t: "error", message: `${busy ? "지금 상담 요청이 많습니다." : "답을 쓰는 중 문제가 생겼습니다."} 질문권은 되돌려 드렸습니다. 잠시 뒤 다시 질문해 주세요.` });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
