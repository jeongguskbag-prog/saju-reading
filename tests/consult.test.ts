import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// AI 호출은 가짜 스트림으로 바꾼다.
const streamMock = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status?: number;
  }
  class RateLimitError extends APIError {}
  class AuthenticationError extends APIError {}
  class Anthropic {
    static APIError = APIError;
    static RateLimitError = RateLimitError;
    static AuthenticationError = AuthenticationError;
    beta = { messages: { stream: streamMock } };
  }
  return { default: Anthropic };
});

import type { BirthInput } from "@/lib/saju/calc";
import { confirmOrder, getReport } from "@/lib/orders";
import { addProfile, findOrCreateMember, getMember, sessionValue, WELCOME_QUESTIONS } from "@/lib/member";
import { consultMessages, consultSystem, createQuestionOrder, creditQuestionOrder, getTurns, refundQuestion, takeQuestion } from "@/lib/consult";
import { calculateSaju } from "@/lib/saju/calc";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import { POST } from "@/app/api/consult/route";

const input: BirthInput = { name: "홍길동", gender: "female", calendar: "solar", year: 1978, month: 8, day: 8, hour: 10, minute: 0 };

function fakeStream(parts: string[], stop = "end_turn") {
  return {
    async *[Symbol.asyncIterator]() {
      for (const p of parts) yield { type: "content_block_delta", delta: { type: "text_delta", text: p } };
    },
    finalMessage: async () => ({ stop_reason: stop }),
  };
}

async function readEvents(res: Response) {
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { t: string; v?: string; left?: number; message?: string });
}

async function setup() {
  const { member } = await findOrCreateMember("kakao", "77", "길동");
  const profile = await addProfile(member.id, input);
  const req = (question: string, headers: Record<string, string> = {}) =>
    new Request("http://x.test/api/consult", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: `chungirok_member=${sessionValue(member.id)}`, ...headers },
      body: JSON.stringify({ profileId: profile.id, question }),
    });
  return { member, profile, req };
}

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  streamMock.mockReset();
  vi.stubEnv("KAKAO_REST_API_KEY", "kakao-test-key");
  vi.stubEnv("MEMBER_SESSION_SECRET", "x".repeat(40));
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("질문권", () => {
  it("무료부터 쓰고, 되돌릴 수 있다", async () => {
    const { member } = await findOrCreateMember("kakao", "1", "a");
    for (let i = 0; i < WELCOME_QUESTIONS; i++) expect(await takeQuestion(member.id)).toBe("free");
    expect(await takeQuestion(member.id)).toBeNull();
    await refundQuestion(member.id, "free");
    expect((await getMember(member.id))?.freeQuestions).toBe(1);
  });

  it("질문권 주문은 결제 뒤 한 번만 넣어 주고, 감정서로 열리지 않는다", async () => {
    const { member } = await findOrCreateMember("kakao", "2", "a");
    const order = await createQuestionOrder(member, "q5", input);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ orderId: order.id, status: "DONE", totalAmount: order.amount }), { status: 200 })));
    const { order: paid } = await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount });
    expect(await creditQuestionOrder(paid)).toBe(5);
    expect(await creditQuestionOrder(paid)).toBe(0);
    expect((await getMember(member.id))?.paidQuestions).toBe(5);
    expect((await getMember(member.id))?.orderIds).toEqual([]); // 감정서 보관함에 넣지 않는다
    expect(await getReport(paid.token!)).toBeNull();
  });
});

describe("AI 요청 모양", () => {
  it("명식은 system 끝에 캐시 표시와 함께, 날짜는 질문 쪽에", () => {
    const chart = calculateSaju(input, new Date("2026-10-15T00:00:00Z"));
    const system = consultSystem(chart);
    expect(system.at(-1)?.cache_control).toEqual({ type: "ephemeral" });
    expect(JSON.stringify(system)).not.toContain("홍길동");
    const msgs = consultMessages([{ q: "앞 질문", a: "앞 답", at: "" }], "올해 이직?", new Date("2026-10-15T00:00:00Z"));
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(String(msgs[2].content)).toContain("2026년 10월 15일");
  });
});

describe("AI 상담 API", () => {
  it("답을 흘려보내고 대화를 남기며 질문권을 하나 쓴다", async () => {
    const { member, profile, req } = await setup();
    streamMock.mockReturnValue(fakeStream(["올해는 ", "움직이기 좋은 해입니다."]));
    const events = await readEvents(await POST(req("올해 이직해도 될까요?")));
    expect(events.filter((e) => e.t === "d").map((e) => e.v).join("")).toBe("올해는 움직이기 좋은 해입니다.");
    expect(events.at(-1)).toEqual({ t: "done", left: WELCOME_QUESTIONS - 1 });
    expect((await getTurns(member.id, profile.id))[0]).toMatchObject({ q: "올해 이직해도 될까요?", a: "올해는 움직이기 좋은 해입니다." });
  });

  it("거절되거나 실패하면 질문권을 되돌린다", async () => {
    const { member, req } = await setup();
    streamMock.mockReturnValue(fakeStream([], "refusal"));
    const events = await readEvents(await POST(req("질문")));
    expect(events.at(-1)?.t).toBe("error");
    streamMock.mockImplementation(() => {
      throw new Error("boom");
    });
    expect((await readEvents(await POST(req("질문")))).at(-1)?.t).toBe("error");
    expect((await getMember(member.id))?.freeQuestions).toBe(WELCOME_QUESTIONS);
  });

  it("질문권이 없으면 402, 앱 키가 있으면 질문권 없이", async () => {
    const { member, req } = await setup();
    for (let i = 0; i < WELCOME_QUESTIONS; i++) await takeQuestion(member.id);
    const res = await POST(req("질문"));
    expect(res.status).toBe(402);
    expect((await res.json()).needPurchase).toBe(true);
    vi.stubEnv("APP_ACCESS_KEY", "k".repeat(20));
    streamMock.mockReturnValue(fakeStream(["답"]));
    const events = await readEvents(await POST(req("질문", { "x-app-key": "k".repeat(20) })));
    expect(events.at(-1)?.t).toBe("done");
  });

  it("로그인하지 않았거나 질문이 너무 길면 막는다", async () => {
    const { req } = await setup();
    expect((await POST(new Request("http://x.test/api/consult", { method: "POST", body: "{}" }))).status).toBe(401);
    expect((await POST(req("가".repeat(501)))).status).toBe(400);
  });
});
