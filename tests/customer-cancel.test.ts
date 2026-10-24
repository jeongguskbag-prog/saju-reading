import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canCustomerCancel, confirmOrder, createOrder, customerCancel, getReport, markMailed } from "@/lib/orders";
import { createMemoryStore, requireStore, setStoreForTest } from "@/lib/store";
import type { BirthInput } from "@/lib/saju/calc";

const input: BirthInput = { name: "홍길동", gender: "male", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 };
const reply = (body: object, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
const PAID = new Date("2026-10-24T01:00:00Z");

beforeEach(() => {
  setStoreForTest(createMemoryStore());
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function paidFull() {
  const order = await createOrder(input, "a@b.co", "full", PAID);
  vi.stubGlobal("fetch", reply({ orderId: order.id, status: "DONE", totalAmount: order.amount, approvedAt: PAID.toISOString() }));
  return (await confirmOrder({ paymentKey: "pk_c", orderId: order.id, amount: order.amount }, PAID)).order;
}

describe("손님의 발송 전 취소", () => {
  it("발송 시각 전에는 손님이 직접 취소하고 결제가 전액 취소된다", async () => {
    const paid = await paidFull();
    const before = new Date(PAID.getTime() + 10 * 60_000);
    expect(canCustomerCancel(paid, before)).toBe(true);
    const cancel = reply({ status: "CANCELED" });
    vi.stubGlobal("fetch", cancel);
    const done = await customerCancel(paid.token!, before);
    expect(done.status).toBe("cancelled");
    expect(cancel).toHaveBeenCalledOnce();
    expect(String((cancel.mock.calls[0] as unknown[])[0])).toContain("/v1/payments/pk_c/cancel");
    // 취소된 주문은 감정서가 열리지 않고, 발송 표시가 잡혀 있어 보내지 않는다
    expect(await getReport(paid.token!)).toBeNull();
    expect(await markMailed(paid.id)).toBe(false);
    // 다시 눌러도 그대로
    expect((await customerCancel(paid.token!, before)).status).toBe("cancelled");
  });

  it("발송 시각이 지났거나 이미 보낸 주문은 취소되지 않는다", async () => {
    const paid = await paidFull();
    const after = new Date(new Date(paid.releaseAt!).getTime() + 1000);
    expect(canCustomerCancel(paid, after)).toBe(false);
    await expect(customerCancel(paid.token!, after)).rejects.toThrow("취소·환불할 수 없습니다");
    const before = new Date(PAID.getTime() + 60_000);
    await markMailed(paid.id);
    await expect(customerCancel(paid.token!, before)).rejects.toThrow("취소·환불할 수 없습니다");
  });

  it("결제 취소가 실패하면 발송 표시를 풀어 정상 발송되게 한다", async () => {
    const paid = await paidFull();
    vi.stubGlobal("fetch", reply({ code: "FAILED", message: "토스 오류" }, 500));
    const before = new Date(PAID.getTime() + 60_000);
    await expect(customerCancel(paid.token!, before)).rejects.toThrow("토스 오류");
    expect(await requireStore().get(`mailed:${paid.id}`)).toBeNull();
    expect((await getReport(paid.token!))?.order.status).toBe("paid");
  });
});
