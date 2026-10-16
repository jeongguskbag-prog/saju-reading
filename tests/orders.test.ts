import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput } from "@/lib/saju/calc";
import { checkoutConfig, confirmOrder, createOrder, getOrder, getReport, getSavedPart, lockPart, OrderError, savePart, unlockPart } from "@/lib/orders";
import { PRODUCTS } from "@/lib/product";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import { reportEmail } from "@/lib/mail";
import { sendCompletionIfReady } from "@/lib/fulfill";
import { josa } from "@/lib/josa";
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
    await expect(createOrder(input, "not-an-email", "full", now)).rejects.toBeInstanceOf(OrderError);
  });

  it("주문 번호는 토스 규칙(6~64자, 영문·숫자·-_=)을 따르고 금액은 서버 가격", async () => {
    const order = await createOrder(input, "a@b.co", "full", now);
    expect(order.id).toMatch(/^[A-Za-z0-9_=-]{6,64}$/);
    expect(order.amount).toBe(PRODUCTS.full.price);
    expect(order.productId).toBe("full");
    expect(order.status).toBe("pending");
    expect((await getOrder(order.id))?.email).toBe("a@b.co");
  });

  it("결제 금액이 주문 금액과 다르면 토스에 승인 요청을 보내지 않는다", async () => {
    const order = await createOrder(input, "a@b.co", "full", now);
    const fetchMock = tossReply({});
    vi.stubGlobal("fetch", fetchMock);
    await expect(confirmOrder({ paymentKey: "pk", orderId: order.id, amount: 100 })).rejects.toThrow("금액");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("승인되면 리포트 토큰을 발급하고, 새로고침해도 같은 토큰", async () => {
    const order = await createOrder(input, "a@b.co", "full", now);
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
    const order = await createOrder(input, "a@b.co", "full", now);
    vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount }));
    await confirmOrder({ paymentKey: "pk_1", orderId: order.id, amount: order.amount });
    await expect(confirmOrder({ paymentKey: "pk_2", orderId: order.id, amount: order.amount })).rejects.toThrow("이미");
  });

  it("토스가 승인을 거절하면 주문은 결제 전 상태로 남는다", async () => {
    const order = await createOrder(input, "a@b.co", "full", now);
    vi.stubGlobal("fetch", tossReply({ code: "REJECT_CARD_COMPANY", message: "카드사에서 거절했습니다." }, 400));
    await expect(confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount })).rejects.toThrow("카드사");
    expect((await getOrder(order.id))?.status).toBe("pending");
  });

  it("승인 응답 금액이 다르면 결제로 인정하지 않는다", async () => {
    const order = await createOrder(input, "a@b.co", "full", now);
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
    const order = await createOrder(input, "a@b.co", "full", now);
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
    const order = await createOrder({ ...input, name: "<b>홍</b>" }, "a@b.co", "core", now);
    const { subject, html, text } = reportEmail(order, "https://x.test/r/abc", "2026-11-14T03:00:00Z");
    expect(subject).toBe("[천기록] 의뢰하신 <b>홍</b> 님의 맞춤 감정서가 완성되었습니다");
    expect(html).toContain("&lt;b&gt;홍&lt;/b&gt; 님");
    expect(html).toContain("https://x.test/r/abc");
    // 받침에 맞는 조사, 열람 마감일(한국 시간)
    expect(text).toContain("[천기록 핵심 명식록]이 완성되었습니다");
    expect(text).toContain("2026년 11월 14일까지");
  });
});

describe("상품·열람 기간·완성 메일", () => {
  async function paidOrder(productId: "full" | "core", paidAt = "2026-10-15T12:00:00+09:00") {
    const order = await createOrder(input, "a@b.co", productId, now);
    vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount, approvedAt: paidAt }));
    const { order: paid } = await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount });
    vi.unstubAllGlobals();
    return paid;
  }

  it("작명록은 신청서가 있어야 하고, 성함 없는 주문은 만들지 않는다", async () => {
    await expect(createOrder(input, "a@b.co", "naming", now)).rejects.toThrow("작명 신청");
    await expect(createOrder({ ...input, name: " " }, "a@b.co", "full", now)).rejects.toThrow("성함");
  });

  it("작명록 주문은 70,000원이고 신청서를 함께 저장한다", async () => {
    const naming = { mode: "baby" as const, surname: "김", surnameHanja: "金", feelings: ["지혜" as const] };
    const order = await createOrder({ ...input, name: "김○○" }, "a@b.co", "naming", now, naming);
    expect(order.amount).toBe(70000);
    expect(order.naming).toEqual(naming);
    // 인명용이 아닌 돌림자는 결제 전에 거절
    await expect(
      createOrder({ ...input, name: "김○○" }, "a@b.co", "naming", now, { ...naming, generation: { hanja: "龘", reading: "답", position: "first" } }),
    ).rejects.toThrow("돌림자");
  });

  it("핵심 명식록은 29,000원, 발간사·1부·5부만", async () => {
    const order = await createOrder(input, "a@b.co", "core", now);
    expect(order.amount).toBe(29000);
    expect(PRODUCTS.core.parts).toEqual(["intro", "part1", "part5"]);
  });

  it("핵심 명식록 링크로 2부를 요청하면 거절(400)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    const paid = await paidOrder("core");
    const res = await readingPOST(new Request("http://x/api/reading", { method: "POST", body: JSON.stringify({ token: paid.token, part: "part2" }) }));
    expect(res.status).toBe(400);
  });

  it("결제 후 30일이 지나면 열람 기간 만료(410)", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    const paid = await paidOrder("full", "2026-08-01T12:00:00+09:00");
    const report = await getReport(paid.token!);
    expect(report?.expired).toBe(true);
    const res = await readingPOST(new Request("http://x/api/reading", { method: "POST", body: JSON.stringify({ token: paid.token, part: "intro" }) }));
    expect(res.status).toBe(410);
    const fresh = await getReport(paid.token!, new Date("2026-08-20T00:00:00Z"));
    expect(fresh?.expired).toBe(false);
  });

  it("모든 파트가 저장되면 완성 메일을 한 번만 보낸다", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("MAIL_FROM", "천기록 <a@x.kr>");
    const paid = await paidOrder("core", new Date().toISOString());
    const report = (await getReport(paid.token!))!;
    const mail = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", mail);
    const intro = { part: "intro" as const, intro: { coverKeywords: ["k"], summary: "s", preface: ["p"] } };
    const ch = (part: "part1" | "part5") => ({ part, chapter: { sections: [{ heading: "h", paragraphs: ["p"] }], actionPlan: [] } });
    await savePart(paid.token!, "intro", intro);
    await savePart(paid.token!, "part1", ch("part1"));
    expect(await sendCompletionIfReady(report, "https://x.test")).toBe(false); // 5부가 아직 없음
    await savePart(paid.token!, "part5", ch("part5"));
    expect(await sendCompletionIfReady(report, "https://x.test")).toBe(true);
    expect(await sendCompletionIfReady(report, "https://x.test")).toBe(false); // 두 번째는 보내지 않음
    expect(mail).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mail.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.to).toEqual(["a@b.co"]);
    expect(body.text).toContain(`https://x.test/r/${paid.token}`);
  });

  it("메일 설정이 없으면 보내지 않고, 나중에 설정하면 보낼 수 있게 표시를 남기지 않는다", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const paid = await paidOrder("core", new Date().toISOString());
    const report = (await getReport(paid.token!))!;
    for (const part of ["intro", "part1", "part5"] as const) {
      await savePart(paid.token!, part, part === "intro" ? { part, intro: { coverKeywords: ["k"], summary: "s", preface: ["p"] } } : { part, chapter: { sections: [{ heading: "h", paragraphs: ["p"] }], actionPlan: [] } });
    }
    expect(await sendCompletionIfReady(report, "https://x.test")).toBe(false);
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("MAIL_FROM", "a@x.kr");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    expect(await sendCompletionIfReady(report, "https://x.test")).toBe(true);
  });
});

describe("조사", () => {
  it("받침에 따라 을/를, 이/가", () => {
    expect(josa("천기록 핵심 명식록", "을", "를")).toBe("천기록 핵심 명식록을");
    expect(josa("천기록 종합 감정서", "을", "를")).toBe("천기록 종합 감정서를");
    expect(josa("천기록 종합 감정서", "이", "가")).toBe("천기록 종합 감정서가");
  });
});

describe("저장소 잠금", () => {
  it("파일 저장소: 동시에 setIfAbsent를 불러도 한 번만 성공", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "store-"));
    vi.stubEnv("VITEST", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    setStoreForTest(undefined as never);
    const { getStore } = await import("@/lib/store");
    const store = getStore()!;
    const results = await Promise.all(Array.from({ length: 10 }, () => store.setIfAbsent("mailed:x", 1)));
    expect(results.filter(Boolean)).toHaveLength(1);
    vi.restoreAllMocks();
  });
});

describe("휴대폰 결제 설정", () => {
  it("TOSS_MOBILE_PHONE=1일 때만 휴대폰 결제를 연다", () => {
    vi.stubEnv("TOSS_CLIENT_KEY", "test_ck_x");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    vi.stubEnv("TOSS_MOBILE_PHONE", "");
    expect(checkoutConfig().mobilePhone).toBe(false);
    vi.stubEnv("TOSS_MOBILE_PHONE", "1");
    expect(checkoutConfig().mobilePhone).toBe(true);
    vi.stubEnv("TOSS_SECRET_KEY", "");
    expect(checkoutConfig().mobilePhone).toBe(false); // 결제가 닫히면 휴대폰 결제도 닫힘
  });
});

describe("실제 사이트의 테스트 결제 차단", () => {
  it("Production에서 test_ 키면 결제를 닫고, live_ 키면 연다", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_x");
    vi.stubEnv("TOSS_CLIENT_KEY", "test_ck_x");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("ALLOW_TEST_PAYMENTS", "");
    expect(checkoutConfig().enabled).toBe(false);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(checkoutConfig().enabled).toBe(true); // 미리보기는 테스트 가능
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TOSS_CLIENT_KEY", "live_ck_x");
    vi.stubEnv("TOSS_SECRET_KEY", "live_sk_x");
    expect(checkoutConfig().enabled).toBe(true);
    expect(checkoutConfig().testMode).toBe(false);
  });
});
