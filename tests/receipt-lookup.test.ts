import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput } from "@/lib/saju/calc";
import { confirmOrder, createOrder } from "@/lib/orders";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import { receiptEmail, receiptKakaoText, receiptKakaoVariables, receiptLinks, receiptSmsText, sendReceipt } from "@/lib/receipt";
import { lookupOrder, LOOKUP_PER_HOUR } from "@/lib/lookup";

vi.mock("@/lib/render", () => ({ renderReportFiles: vi.fn(async () => { throw new Error("no chrome in tests"); }) }));

const input: BirthInput = { name: "홍길동", gender: "female", calendar: "solar", year: 1978, month: 8, day: 8, hour: 10, minute: 0 };
const now = new Date("2026-10-15T03:00:00Z");
const json = (b: object, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
  vi.stubEnv("RESEND_API_KEY", "re_x");
  vi.stubEnv("MAIL_FROM", "천기록 <a@b.co>");
  vi.stubEnv("SOLAPI_API_KEY", "k");
  vi.stubEnv("SOLAPI_API_SECRET", "s");
  vi.stubEnv("SMS_FROM", "0212345678");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function paid(targets: ("email" | "kakao" | "sms")[], email = "c@d.co", phone: string | undefined = "010-1234-5678") {
  const order = await createOrder(input, email, "core", now, undefined, phone, targets);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => json({ orderId: order.id, status: "DONE", totalAmount: order.amount, method: "카드", approvedAt: "2026-10-15T12:05:00+09:00", receipt: { url: "https://dashboard.tosspayments.com/receipt/x" } })),
  );
  return (await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount })).order;
}

describe("결제 확인 발송", () => {
  it("주문번호·상품·금액·결제 일시·감정서·주문 조회·영수증이 들어간다", async () => {
    const o = await paid(["email"]);
    const links = receiptLinks("https://x.test", o);
    const sms = receiptSmsText(o, links);
    expect(sms).toContain(`주문번호: ${o.id}`);
    expect(sms).toContain("결제 금액: 29,000원 (카드)");
    expect(sms).toContain("결제 일시: 2026.10.15 12:05");
    expect(sms).toContain(`https://x.test/r/${o.token}`);
    expect(sms).toContain("https://x.test/order");
    expect(sms).toContain("카드 영수증");
    expect(receiptEmail(o, links).subject).toContain(o.id);
    const k = receiptKakaoText(receiptKakaoVariables(o, links));
    expect(k).not.toContain("#{");
  });

  it("고른 곳 모두로 한 번만 보낸다(카카오톡 템플릿이 없으면 문자로)", async () => {
    vi.stubEnv("KAKAO_PF_ID", "PF");
    vi.stubEnv("KAKAO_RECEIPT_TEMPLATE_ID", "TP_R");
    const o = await paid(["email", "kakao", "sms"]);
    const calls = vi.fn(async (url: string) => (url.includes("/emails") ? json({ id: "m" }) : json({ failedMessageList: [] })));
    vi.stubGlobal("fetch", calls);
    expect(await sendReceipt(o, "https://x.test")).toBe(true);
    expect(await sendReceipt(o, "https://x.test")).toBe(false);
    const urls = calls.mock.calls.map((c) => c[0] as string);
    expect(urls.filter((u) => u.includes("/emails"))).toHaveLength(1);
    const body = JSON.parse((calls.mock.calls.find((c) => (c[0] as string).includes("send-many")) as unknown as [string, RequestInit])[1].body as string);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].kakaoOptions).toMatchObject({ templateId: "TP_R", disableSms: true });
  });

  it("이메일만 고르면 휴대폰 번호가 있어도 문자는 보내지 않는다", async () => {
    const o = await paid(["email"]);
    const calls = vi.fn(async () => json({ id: "m" }));
    vi.stubGlobal("fetch", calls);
    await sendReceipt(o, "https://x.test");
    expect(calls.mock.calls.every((c) => (c as unknown as [string])[0].includes("/emails"))).toBe(true);
  });
});

describe("주문 조회", () => {
  it("주문번호와 이메일 또는 휴대폰 번호가 맞으면 감정서 주소를 준다", async () => {
    const o = await paid(["email"]);
    expect(await lookupOrder(o.id, "C@D.co", "1.1.1.1")).toEqual({ ok: true, url: `/r/${o.token}` });
    expect(await lookupOrder(` ${o.id.toUpperCase()} `, "010 1234 5678", "1.1.1.1")).toEqual({ ok: true, url: `/r/${o.token}` });
    expect((await lookupOrder(o.id, "010-9999-9999", "1.1.1.1")).ok).toBe(false);
    expect((await lookupOrder("CGR-20261015-0000000000000000", "c@d.co", "1.1.1.1")).ok).toBe(false);
  });

  it("같은 기기에서 너무 많이 시도하면 막는다", async () => {
    const o = await paid(["email"]);
    for (let i = 0; i < LOOKUP_PER_HOUR; i++) await lookupOrder(o.id, "x@y.co", "2.2.2.2");
    const r = await lookupOrder(o.id, "c@d.co", "2.2.2.2");
    expect(r).toMatchObject({ ok: false, status: 429 });
  });
});

describe("주문 기록(관리)", async () => {
  const { listPaidOrders } = await import("@/lib/orders");
  const { orderRow, ordersCsv, checkAdminPassword, checkAdminSession, adminSessionValue } = await import("@/lib/admin");

  it("결제한 주문은 목록에 남고, 결제 정보·사주 입력·연락처가 표 한 줄로 나온다", async () => {
    const a = await paid(["email"]);
    const b = await paid(["sms"], "", "010-5555-6666");
    const list = await listPaidOrders();
    expect(list.map((o) => o.id)).toEqual([b.id, a.id]);
    const row = orderRow(list[1], "https://x.test");
    expect(row).toMatchObject({
      주문번호: a.id,
      "결제 금액": "29,000원",
      "결제 수단": "카드",
      성함: "홍길동",
      성별: "여",
      "양력·음력": "양력",
      생년월일: "1978-08-08",
      "태어난 시각": "10:00",
      이메일: "c@d.co",
      "받을 곳": "이메일",
      "감정서 주소": `https://x.test/r/${a.token}`,
    });
    const csv = ordersCsv([row]);
    expect(csv.startsWith("﻿결제일시,주문번호")).toBe(true);
    expect(csv).toContain(a.id);
  });

  it("관리 비밀번호와 쿠키를 확인한다", () => {
    vi.stubEnv("ADMIN_PASSWORD", "correct-horse");
    expect(checkAdminPassword("correct-horse")).toBe(true);
    expect(checkAdminPassword("wrong")).toBe(false);
    expect(checkAdminSession(adminSessionValue()!)).toBe(true);
    expect(checkAdminSession("x")).toBe(false);
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(checkAdminPassword("")).toBe(false);
  });
});

describe("주문 접수 API", () => {
  it("휴대폰 번호가 없으면 주문을 받지 않는다", async () => {
    vi.stubEnv("TOSS_CLIENT_KEY", "test_ck_x");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-x");
    const { POST } = await import("@/app/api/orders/route");
    const body = { input, agree: true, email: "c@d.co", targets: ["email"], productId: "core" };
    const call = (b: object) => POST(new Request("http://x/api/orders", { method: "POST", body: JSON.stringify(b) }));
    const res = await call(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("휴대폰");
    const ok = await call({ ...body, phone: "010-1234-5678" });
    expect(ok.status).toBe(200);
    expect((await ok.json()).customerMobilePhone).toBe("01012345678");
  });
});
