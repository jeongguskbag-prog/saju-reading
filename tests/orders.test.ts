import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput } from "@/lib/saju/calc";
import { checkoutConfig, confirmOrder, createOrder, getOrder, getReport, getSavedPart, lockPart, OrderError, savePart, unlockPart } from "@/lib/orders";
import { PRODUCT } from "@/lib/product";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import { reportEmail } from "@/lib/mail";
import { POST as readingPOST } from "@/app/api/reading/route";

const input: BirthInput = { name: "홍길동", gender: "female", calendar: "solar", year: 1978, month: 8, day: 8, hour: 10, minute: 0 };
const now = new Date("2026-10-15T03:00:00Z");

function tossReply(body: object, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("주문", () => {
  it("이메일이 이상하면 주문을 만들지 않는다", async () => {
    await expect(createOrder(input, "not-an-email", now)).rejects.toBeInstanceOf(OrderError);
  });

  it("주문 번호는 토스 규칙(6~64자, 영문·숫자·-_=)을 따르고 금액은 서버 가격", async () => {
    const order = await createOrder(input, "a@b.co", now);
    expect(order.id).toMatch(/^[A-Za-z0-9_=-]{6,64}$/);
    expect(order.amount).toBe(PRODUCT.price);
    expect(order.status).toBe("pending");
    expect((await getOrder(order.id))?.email).toBe("a@b.co");
  });

  it("결제 금액이 주문 금액과 다르면 토스에 승인 요청을 보내지 않는다", async () => {
    const order = await createOrder(input, "a@b.co", now);
    const fetchMock = tossReply({});
    vi.stubGlobal("fetch", fetchMock);
    await expect(confirmOrder({ paymentKey: "pk", orderId: order.id, amount: 100 })).rejects.toThrow("금액");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("승인되면 리포트 토큰을 발급하고, 새로고침해도 같은 토큰", async () => {
    const order = await createOrder(input, "a@b.co", now);
    const fetchMock = tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount, method: "카드", approvedAt: "2026-10-15T12:00:00+09:00" });
    vi.stubGlobal("fetch", fetchMock);
    const first = await confirmOrder({ paymentKey: "pk_1", orderId: order.id, amount: order.amount });
    expect(first.justPaid).toBe(true);
    expect(first.order.token).toBeTruthy();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.tosspayments.com/v1/payments/confirm");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from("test_sk_dummy:").toString("base64")}`);

    const again = await confirmOrder({ paymentKey: "pk_1", orderId: order.id, amount: order.amount });
    expect(again.justPaid).toBe(false);
    expect(again.order.token).toBe(first.order.token);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const report = await getReport(first.order.token!);
    expect(report?.chart.pillars.day.stem).toBe("壬");
    // 감정 연도는 결제 시점 기준으로 고정
    expect(report?.chart.analysis.reportYears).toEqual([2026, 2027]);
  });

  it("다른 결제 키로 이미 결제된 주문을 다시 승인할 수 없다", async () => {
    const order = await createOrder(input, "a@b.co", now);
    vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount }));
    await confirmOrder({ paymentKey: "pk_1", orderId: order.id, amount: order.amount });
    await expect(confirmOrder({ paymentKey: "pk_2", orderId: order.id, amount: order.amount })).rejects.toThrow("이미");
  });

  it("토스가 승인을 거절하면 주문은 결제 전 상태로 남는다", async () => {
    const order = await createOrder(input, "a@b.co", now);
    vi.stubGlobal("fetch", tossReply({ code: "REJECT_CARD_COMPANY", message: "카드사에서 거절했습니다." }, 400));
    await expect(confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount })).rejects.toThrow("카드사");
    expect((await getOrder(order.id))?.status).toBe("pending");
  });

  it("승인 응답 금액이 다르면 결제로 인정하지 않는다", async () => {
    const order = await createOrder(input, "a@b.co", now);
    vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: 1 }));
    await expect(confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount })).rejects.toThrow("맞지 않습니다");
    expect((await getOrder(order.id))?.status).toBe("pending");
  });

  it("없는 토큰·이상한 토큰은 리포트를 주지 않는다", async () => {
    expect(await getReport("nope")).toBeNull();
    expect(await getReport("a".repeat(32))).toBeNull();
  });
});

describe("리포트 파트 저장", () => {
  it("잠금은 한 번에 한 곳만, 풀면 다시 잡을 수 있다", async () => {
    expect(await lockPart("tok", "part1")).toBe(true);
    expect(await lockPart("tok", "part1")).toBe(false);
    await unlockPart("tok", "part1");
    expect(await lockPart("tok", "part1")).toBe(true);
  });

  it("저장한 파트를 그대로 돌려준다", async () => {
    const r = { part: "part1" as const, chapter: { sections: [{ heading: "h", paragraphs: ["p"] }], actionPlan: [] } };
    await savePart("tok", "part1", r);
    expect(await getSavedPart("tok", "part1")).toEqual(r);
  });
});

describe("결제 설정", () => {
  it("토스 키·AI 키가 없으면 결제를 열지 않는다", () => {
    vi.stubEnv("TOSS_CLIENT_KEY", "");
    vi.stubEnv("TOSS_SECRET_KEY", "");
    expect(checkoutConfig().enabled).toBe(false);
  });

  it("키가 모두 있으면 열고, test_ 키면 테스트 모드", () => {
    vi.stubEnv("TOSS_CLIENT_KEY", "test_ck_x");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    const c = checkoutConfig();
    expect(c.enabled).toBe(true);
    expect(c.testMode).toBe(true);
    expect(c.clientKey).toBe("test_ck_x");
  });
});

describe("풀이 API", () => {
  const call = (body: object) => readingPOST(new Request("http://x/api/reading", { method: "POST", body: JSON.stringify(body) }));

  it("무료 모드가 아니면 생년월일만으로는 풀이를 주지 않는다(402)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    vi.stubEnv("FREE_READING", "");
    const res = await call({ input, part: "part1" });
    expect(res.status).toBe(402);
  });

  it("결제하지 않은 토큰이면 404", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    const res = await call({ token: "b".repeat(32), part: "part1" });
    expect(res.status).toBe(404);
  });

  it("이미 저장된 파트는 AI를 부르지 않고 돌려준다", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    const order = await createOrder(input, "a@b.co", now);
    vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount }));
    const { order: paid } = await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount });
    const saved = { part: "intro" as const, intro: { coverKeywords: ["k"], summary: "s", preface: ["p"] } };
    await savePart(paid.token!, "intro", saved);
    const res = await call({ token: paid.token, part: "intro" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(saved);
  });
});

describe("리포트 메일", () => {
  it("이름과 링크를 담고, 이름의 HTML은 이스케이프한다", async () => {
    const order = await createOrder({ ...input, name: "<b>홍</b>" }, "a@b.co", now);
    const { subject, html } = reportEmail(order, "https://x.test/r/abc");
    expect(subject).toContain("<b>홍</b>님");
    expect(html).toContain("&lt;b&gt;홍&lt;/b&gt;님");
    expect(html).toContain("https://x.test/r/abc");
  });
});
