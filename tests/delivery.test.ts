import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput } from "@/lib/saju/calc";
import { confirmOrder, createOrder, getOrder, getReport, savePart } from "@/lib/orders";
import { createMemoryStore, setStoreForTest } from "@/lib/store";
import { deliverReport, deliveryDelayMinutes, webRevealMinutes, fileLinks, scheduleDelivery } from "@/lib/delivery";
import { sendCompletionIfReady } from "@/lib/fulfill";
import { reportEmail } from "@/lib/mail";
import { kakaoText, kakaoVariables, reportSmsText } from "@/lib/sms";
import { attachmentHeader, reportBaseName } from "@/lib/render";
import type { PartResult } from "@/lib/report-shared";

const input: BirthInput = { name: "홍길동", gender: "female", calendar: "solar", year: 1978, month: 8, day: 8, hour: 10, minute: 0 };
const now = new Date("2026-10-15T03:00:00Z");
const json = (b: object, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
  vi.stubEnv("RESEND_API_KEY", "re_x");
  vi.stubEnv("MAIL_FROM", "천기록 <a@b.co>");
  vi.stubEnv("SOLAPI_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function paidCore() {
  const order = await createOrder(input, "c@d.co", "core", now);
  vi.stubGlobal("fetch", vi.fn(async () => json({ orderId: order.id, status: "DONE", totalAmount: order.amount, approvedAt: now.toISOString() })));
  const { order: paid } = await confirmOrder({ paymentKey: "pk", orderId: order.id, amount: order.amount });
  return paid;
}

async function fillParts(token: string) {
  const report = (await getReport(token, now))!;
  for (const p of report.product.parts) await savePart(token, p, { part: p } as unknown as PartResult);
}

const fakeFiles = async () => ({ pdf: Buffer.from("%PDF-1.7 test"), html: "<!doctype html><p>감정서</p>", baseName: "천기록_홍길동_핵심감정서" });

describe("감정서 파일 발송", () => {
  it("발송 지연은 기본 10분, 설정으로 바꿀 수 있다", () => {
    expect(deliveryDelayMinutes()).toBe(10);
    expect(webRevealMinutes()).toBe(3);
    vi.stubEnv("DELIVERY_DELAY_MINUTES", "0");
    expect(deliveryDelayMinutes()).toBe(0);
    vi.stubEnv("DELIVERY_DELAY_MINUTES", "abc");
    expect(deliveryDelayMinutes()).toBe(10);
  });

  it("QStash 설정이 없으면 예약하지 않고(null) 완성 즉시 보낸다", async () => {
    const paid = await paidCore();
    expect(await scheduleDelivery(paid, "https://x.test", now)).toBeNull();
    expect((await getOrder(paid.id))?.deliverAt).toBeUndefined();
  });

  it("다 쓰기 전에는 보내지 않는다", async () => {
    const paid = await paidCore();
    const report = (await getReport(paid.token!, now))!;
    expect(await deliverReport(report, "https://x.test", fakeFiles)).toBe("incomplete");
  });

  it("이메일에 PDF·HTML을 첨부하고, 한 번만 보낸다", async () => {
    const paid = await paidCore();
    await fillParts(paid.token!);
    const mail = vi.fn(async () => json({ id: "m1" }));
    vi.stubGlobal("fetch", mail);
    const report = (await getReport(paid.token!, now))!;
    expect(await deliverReport(report, "https://x.test", fakeFiles)).toBe("sent");
    const body = JSON.parse((mail.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.attachments.map((a: { filename: string }) => a.filename)).toEqual(["천기록_홍길동_핵심감정서.pdf", "천기록_홍길동_핵심감정서.html"]);
    expect(Buffer.from(body.attachments[0].content, "base64").toString()).toBe("%PDF-1.7 test");
    expect(body.text).toContain(`https://x.test/r/${paid.token}/pdf`);
    expect(body.html).toContain("첨부");
    expect(await deliverReport(report, "https://x.test", fakeFiles)).toBe("already");
    expect(mail).toHaveBeenCalledTimes(1);
  });

  it("파일 만들기에 실패해도 링크는 보낸다", async () => {
    const paid = await paidCore();
    await fillParts(paid.token!);
    const mail = vi.fn(async () => json({ id: "m1" }));
    vi.stubGlobal("fetch", mail);
    const report = (await getReport(paid.token!, now))!;
    const broken = async () => {
      throw new Error("chrome");
    };
    expect(await deliverReport(report, "https://x.test", broken)).toBe("sent");
    const body = JSON.parse((mail.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.attachments).toBeUndefined();
    expect(body.text).toContain("/html");
  });

  it("발송 예약된 주문은 완성되어도 바로 보내지 않는다", async () => {
    const paid = await paidCore();
    await fillParts(paid.token!);
    const report = (await getReport(paid.token!, now))!;
    report.order.deliverAt = new Date(now.getTime() + 50 * 60_000).toISOString();
    const mail = vi.fn(async () => json({ id: "m1" }));
    vi.stubGlobal("fetch", mail);
    expect(await sendCompletionIfReady(report, "https://x.test")).toBe(false);
    expect(mail).not.toHaveBeenCalled();
  });

  it("문자·알림톡·메일 문구에 파일 받기 링크가 들어간다", async () => {
    const paid = await paidCore();
    const links = fileLinks("https://x.test", paid.token!);
    expect(reportSmsText(paid, links.view, now.toISOString(), links)).toContain(links.pdf);
    expect(kakaoText(kakaoVariables(paid, links.view, now.toISOString(), links))).toContain(`HTML 파일 받기: ${links.html}`);
    expect(reportEmail(paid, links.view, now.toISOString(), { files: null, links }).text).toContain(links.html);
  });

  it("파일 이름과 내려받기 머리글", () => {
    expect(reportBaseName({ order: { input: { name: "홍 길/동" } }, product: { name: "천기록 종합 감정서" } } as never)).toBe("천기록_홍길동_종합감정서");
    expect(attachmentHeader("천기록_홍길동", "pdf")).toContain(`filename*=UTF-8''${encodeURIComponent("천기록_홍길동.pdf")}`);
  });
});
