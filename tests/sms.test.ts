import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput } from "@/lib/saju/calc";
import { confirmOrder, createOrder, getReport, savePart } from "@/lib/orders";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import { maskPhone, normalizePhone, reportSmsText, solapiAuth } from "@/lib/sms";
import { sendCompletionIfReady } from "@/lib/fulfill";

const input: BirthInput = { name: "홍길동", gender: "female", calendar: "solar", year: 1978, month: 8, day: 8, hour: 10, minute: 0 };
const now = new Date("2026-10-15T03:00:00Z");
const json = (body: object) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
  vi.stubEnv("SOLAPI_API_KEY", "NCSKEY");
  vi.stubEnv("SOLAPI_API_SECRET", "secret");
  vi.stubEnv("SMS_FROM", "02-123-4567");
  vi.stubEnv("RESEND_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("문자 발송", () => {
  it("휴대폰 번호를 숫자로 맞추고, 아니면 거절한다", () => {
    expect(normalizePhone("010-1234-5678")).toBe("01012345678");
    expect(normalizePhone("+82 10 1234 5678")).toBe("01012345678");
    expect(normalizePhone("02-123-4567")).toBeNull();
    expect(maskPhone("01012345678")).toBe("010-****-5678");
  });

  it("솔라피 인증: HMAC-SHA256(날짜+솔트, 시크릿)을 16진수로", () => {
    const d = new Date("2019-07-01T00:41:48Z");
    const header = solapiAuth("KEY", "secret", d, "jqsba2jxjnrjor");
    const sig = createHmac("sha256", "secret").update("2019-07-01T00:41:48.000Zjqsba2jxjnrjor").digest("hex");
    expect(header).toBe(`HMAC-SHA256 apiKey=KEY, date=2019-07-01T00:41:48.000Z, salt=jqsba2jxjnrjor, signature=${sig}`);
  });

  it("휴대폰으로 받는 주문은 이메일 없이 만들고, 완성되면 문자를 한 번 보낸다", async () => {
    const order = await createOrder(input, "", "core", now, undefined, "010-1234-5678");
    expect(order.phone).toBe("01012345678");
    expect(order.email).toBe("");
    vi.stubGlobal("fetch", vi.fn(async () => json({ orderId: order.id, status: "DONE", totalAmount: order.amount, approvedAt: now.toISOString() })));
    const { order: paid } = await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount });
    const report = (await getReport(paid.token!))!;
    for (const part of ["intro", "part1", "part5"] as const) {
      await savePart(paid.token!, part, part === "intro" ? { part, intro: { coverKeywords: ["k"], summary: "s", preface: ["p"] } } : { part, chapter: { sections: [{ heading: "h", paragraphs: ["p"] }], actionPlan: [] } });
    }
    const sms = vi.fn(async () => json({ groupInfo: {}, failedMessageList: [] }));
    vi.stubGlobal("fetch", sms);
    expect(await sendCompletionIfReady(report, "https://x.test")).toBe(true);
    expect(await sendCompletionIfReady(report, "https://x.test")).toBe(false);
    expect(sms).toHaveBeenCalledTimes(1);
    const [url, init] = sms.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.solapi.com/messages/v4/send-many/detail");
    const body = JSON.parse(init.body as string);
    expect(body.messages[0]).toMatchObject({ to: "01012345678", from: "021234567", autoTypeDetect: true });
    expect(body.messages[0].text).toContain(`https://x.test/r/${paid.token}`);
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^HMAC-SHA256 apiKey=NCSKEY, date=/);
  });

  it("문자 설정이 없으면 휴대폰 주문을 받지 않는다", async () => {
    vi.stubEnv("SOLAPI_API_KEY", "");
    await expect(createOrder(input, "", "core", now, undefined, "01012345678")).rejects.toThrow("문자");
    await expect(createOrder(input, "", "core", now)).rejects.toThrow("이메일");
  });

  it("문자 본문에 상품 이름과 열람 기한이 들어간다", () => {
    const text = reportSmsText({ input, orderName: "천기록 핵심 명식록" } as never, "https://x.test/r/t", "2026-11-14T03:00:00Z");
    expect(text).toContain("천기록 핵심 명식록");
    expect(text).toContain("2026.11.14까지");
  });
});

describe("카카오톡 알림톡", () => {
  it("카카오톡을 고르면 알림톡 옵션과 대체 문자를 함께 보낸다", async () => {
    vi.stubEnv("KAKAO_PF_ID", "KA01PF");
    vi.stubEnv("KAKAO_TEMPLATE_ID", "KA01TP");
    const order = await createOrder(input, "", "core", now, undefined, "01012345678", "kakao");
    expect(order.channel).toBe("kakao");
    vi.stubGlobal("fetch", vi.fn(async () => json({ orderId: order.id, status: "DONE", totalAmount: order.amount, approvedAt: now.toISOString() })));
    const { order: paid } = await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount });
    const report = (await getReport(paid.token!))!;
    for (const part of ["intro", "part1", "part5"] as const) {
      await savePart(paid.token!, part, part === "intro" ? { part, intro: { coverKeywords: ["k"], summary: "s", preface: ["p"] } } : { part, chapter: { sections: [{ heading: "h", paragraphs: ["p"] }], actionPlan: [] } });
    }
    const sms = vi.fn(async () => json({ failedMessageList: [] }));
    vi.stubGlobal("fetch", sms);
    expect(await sendCompletionIfReady(report, "https://x.test")).toBe(true);
    const body = JSON.parse((sms.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    const m = body.messages[0];
    expect(m.kakaoOptions).toMatchObject({ pfId: "KA01PF", templateId: "KA01TP", disableSms: false });
    expect(m.kakaoOptions.variables["#{링크}"]).toBe(`https://x.test/r/${paid.token}`);
    expect(m.text).toContain("천기록 핵심 명식록 작성이 완료되었습니다");
    expect(m.text).not.toContain("#{");
  });

  it("알림톡 설정이 없으면 카카오톡 주문을 받지 않는다", async () => {
    await expect(createOrder(input, "", "core", now, undefined, "01012345678", "kakao")).rejects.toThrow("카카오톡");
  });
});
