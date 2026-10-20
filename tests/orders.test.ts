import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput } from "@/lib/saju/calc";
import { cancelOrder, checkoutConfig, confirmOrder, createOrder, getOrder, getReport, getSavedPart, isReleased, lockPart, OrderError, orderReleaseAt, savePart, setReleaseAt, unlockPart } from "@/lib/orders";
import { avoidQuietHours, computeReleaseAt, orderWaitLabel, releaseLabel, releaseMinutes } from "@/lib/release";
import { PRODUCTS } from "@/lib/product";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import { reportEmail } from "@/lib/mail";
import { sendCompletionIfReady } from "@/lib/fulfill";
import { josa } from "@/lib/josa";
import { POST as readingPOST } from "@/app/api/reading/route";

// 감정서 파일(헤드리스 크롬)은 시험에서 만들지 않는다.
vi.mock("@/lib/render", () => ({ renderReportFiles: vi.fn(async () => { throw new Error("no chrome in tests"); }) }));

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
    // 공개 시각 전에는 본문을 주지 않는다.
    const held = await call({ token: paid.token, part: "intro" });
    expect(held.status).toBe(202);
    expect(await held.json()).toEqual({ pending: true, held: true });
    await setReleaseAt(paid.id, new Date(0));
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
    // 완성 메일 시험은 공개 시각이 지난 주문으로 한다.
    return (await setReleaseAt(paid.id, new Date(0)))!;
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

describe("실제 사이트의 테스트 결제", () => {
  it("Production에서도 test_ 키로 결제를 열고, BLOCK_TEST_PAYMENTS=1이면 닫는다", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    vi.stubEnv("TOSS_SECRET_KEY", "test_sk_x");
    vi.stubEnv("TOSS_CLIENT_KEY", "test_ck_x");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("BLOCK_TEST_PAYMENTS", "");
    expect(checkoutConfig().enabled).toBe(true);
    expect(checkoutConfig().testMode).toBe(true);
    vi.stubEnv("BLOCK_TEST_PAYMENTS", "1");
    expect(checkoutConfig().enabled).toBe(false);
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(checkoutConfig().enabled).toBe(true); // 미리보기는 늘 테스트 가능
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("TOSS_CLIENT_KEY", "live_ck_x");
    vi.stubEnv("TOSS_SECRET_KEY", "live_sk_x");
    expect(checkoutConfig().enabled).toBe(true);
    expect(checkoutConfig().testMode).toBe(false);
  });
});

describe("공개·발송 시각", () => {
  it("상품별 대기 시간과 설정 덮어쓰기", () => {
    expect(releaseMinutes("iching")).toBe(30);
    expect(releaseMinutes("full")).toBe(120);
    expect(releaseMinutes("naming")).toBe(180);
    expect(releaseMinutes("full", "full=45, iching=10")).toBe(45);
    expect(releaseMinutes("core", "full=45")).toBe(60);
    expect(releaseMinutes("full", "full=abc")).toBe(120);
  });

  it("avoidQuietHours 계산과, 공개 시각은 안내한 시간 그대로", () => {
    // 한국 14:00 → 그대로
    expect(avoidQuietHours(new Date("2026-10-20T05:00:00Z")).toISOString()).toBe("2026-10-20T05:00:00.000Z");
    // 한국 22:30 → 다음 날 08:00
    expect(avoidQuietHours(new Date("2026-10-20T13:30:00Z")).toISOString()).toBe("2026-10-20T23:00:00.000Z");
    // 한국 02:00 → 그날 08:00
    expect(avoidQuietHours(new Date("2026-10-20T17:00:00Z")).toISOString()).toBe("2026-10-20T23:00:00.000Z");
    // 공개 시각은 밤에도 미루지 않는다: 한국 21:00 결제 + 2시간 → 23:00
    expect(computeReleaseAt("full", new Date("2026-10-20T12:00:00Z")).toISOString()).toBe("2026-10-20T14:00:00.000Z");
  });

  it("손님 안내용 대기 시간", () => {
    expect(orderWaitLabel({ createdAt: "x", paidAt: "2026-10-20T05:00:00Z", releaseAt: "2026-10-20T06:00:00Z" })).toBe("1시간");
    expect(orderWaitLabel({ createdAt: "x", paidAt: "2026-10-20T05:00:00Z", releaseAt: "2026-10-20T05:30:00Z" })).toBe("30분");
    expect(orderWaitLabel({ createdAt: "x", paidAt: "2026-10-20T05:00:00Z", releaseAt: "2026-10-20T08:00:00Z" })).toBe("3시간");
  });

  it("공개 시각 문구", () => {
    const now = new Date("2026-10-20T05:00:00Z"); // 한국 14:00
    expect(releaseLabel("2026-10-20T06:10:00Z", now)).toBe("오늘 오후 3:10");
    expect(releaseLabel("2026-10-20T23:00:00Z", now)).toBe("내일 오전 8:00");
    expect(releaseLabel("2026-10-22T23:00:00Z", now)).toBe("10월 23일 오전 8:00");
  });

  it("결제하면 상품별 공개 시각을 정하고, 예전 주문은 결제 3분 뒤", async () => {
    const order = await createOrder(input, "a@b.co", "full", now);
    vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount, approvedAt: "2026-10-20T14:00:00+09:00" }));
    const { order: paid } = await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount });
    expect(paid.releaseAt).toBe("2026-10-20T07:00:00.000Z"); // 한국 16:00
    expect(isReleased(paid, new Date("2026-10-20T06:59:00Z"))).toBe(false);
    expect(isReleased(paid, new Date("2026-10-20T07:00:00Z"))).toBe(true);
    const old = { ...paid, releaseAt: undefined };
    expect(orderReleaseAt(old).toISOString()).toBe("2026-10-20T05:03:00.000Z");
  });

  it("공개 전에는 완성 메일을 보내지 않는다", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("MAIL_FROM", "a@x.kr");
    const order = await createOrder(input, "a@b.co", "core", now);
    vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount, approvedAt: new Date().toISOString() }));
    const { order: paid } = await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount });
    for (const part of ["intro", "part1", "part5"] as const) {
      await savePart(paid.token!, part, part === "intro" ? { part, intro: { coverKeywords: ["k"], summary: "s", preface: ["p"] } } : { part, chapter: { sections: [{ heading: "h", paragraphs: ["p"] }], actionPlan: [] } });
    }
    expect(await sendCompletionIfReady((await getReport(paid.token!))!, "https://x.test")).toBe(false);
  });
});

describe("결제 취소", () => {
  it("토스에 전액 취소를 요청하고 주문을 취소로 바꾸면 감정서가 열리지 않는다", async () => {
    const order = await createOrder(input, "a@b.co", "core", now);
    vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount }));
    const { order: paid } = await confirmOrder({ paymentKey: "pk_c", orderId: order.id, amount: order.amount });
    const cancel = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ status: "CANCELED" }), { status: 200 }));
    vi.stubGlobal("fetch", cancel);
    const done = await cancelOrder(paid.id, "고객 요청");
    expect(done.status).toBe("cancelled");
    expect(cancel.mock.calls[0][0]).toContain("/v1/payments/pk_c/cancel");
    expect(JSON.parse(String(cancel.mock.calls[0][1]?.body))).toEqual({ cancelReason: "고객 요청" });
    expect(await getReport(paid.token!)).toBeNull();
    // 다시 눌러도 토스를 또 부르지 않는다.
    await cancelOrder(paid.id, "고객 요청");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("토스가 거절하면 주문을 바꾸지 않는다", async () => {
    const order = await createOrder(input, "a@b.co", "core", now);
    vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount }));
    const { order: paid } = await confirmOrder({ paymentKey: "pk_d", orderId: order.id, amount: order.amount });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "NOT_CANCELABLE_PAYMENT", message: "취소할 수 없는 결제입니다." }), { status: 403 })));
    await expect(cancelOrder(paid.id, "x")).rejects.toThrow("취소할 수 없는 결제입니다.");
    expect((await getOrder(paid.id))?.status).toBe("paid");
  });
});

describe("휴대폰 번호", () => {
  it("010은 11자리만, 옛 번호는 10~11자리", async () => {
    const { normalizePhone } = await import("@/lib/sms");
    expect(normalizePhone("0109170001")).toBeNull();
    expect(normalizePhone("010-9170-0015")).toBe("01091700015");
    expect(normalizePhone("+82 10-9170-0015")).toBe("01091700015");
    expect(normalizePhone("011-123-4567")).toBe("0111234567");
    expect(normalizePhone("01012345")).toBeNull();
  });
});
