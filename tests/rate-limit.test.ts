import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientIp, PARTS_PER_REPORT, takeFreeQuota } from "@/lib/rate-limit";
import { createMemoryStore, setStoreForTest } from "@/lib/store";

const now = new Date("2026-10-15T03:00:00Z"); // KST 12:00

/** 감정서 n부 분량(6파트 × n)을 요청하고 마지막 결과를 돌려준다. */
async function take(ip: string, parts: number, at = now) {
  let last = await takeFreeQuota(ip, at);
  for (let i = 1; i < parts; i++) last = await takeFreeQuota(ip, at);
  return last;
}

describe("무료 풀이 횟수 제한", () => {
  beforeEach(() => {
    setStoreForTest(createMemoryStore());
    process.env.FREE_LIMIT_PER_HOUR = "2";
    process.env.FREE_LIMIT_PER_DAY = "3";
    process.env.FREE_LIMIT_GLOBAL_PER_DAY = "4";
  });
  afterEach(() => {
    delete process.env.FREE_LIMIT_PER_HOUR;
    delete process.env.FREE_LIMIT_PER_DAY;
    delete process.env.FREE_LIMIT_GLOBAL_PER_DAY;
  });

  it("한 기기는 1시간 한도(+재시도 여유 1부)까지 허용하고 그다음은 막는다", async () => {
    expect((await take("1.1.1.1", 3 * PARTS_PER_REPORT)).ok).toBe(true);
    const blocked = await takeFreeQuota("1.1.1.1", now);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.message).toContain("1시간에 2회");
  });

  it("다음 시간에는 다시 허용하지만 하루 한도는 이어서 센다", async () => {
    await take("1.1.1.1", 3 * PARTS_PER_REPORT);
    const nextHour = new Date(now.getTime() + 3_600_000);
    expect((await take("1.1.1.1", PARTS_PER_REPORT, nextHour)).ok).toBe(true);
    const blocked = await takeFreeQuota("1.1.1.1", nextHour);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.message).toContain("하루 3회");
  });

  it("서비스 전체 하루 한도는 기기와 상관없이 센다", async () => {
    await take("1.1.1.1", 2 * PARTS_PER_REPORT);
    await take("2.2.2.2", 2 * PARTS_PER_REPORT);
    expect((await take("3.3.3.3", PARTS_PER_REPORT)).ok).toBe(true);
    const blocked = await takeFreeQuota("4.4.4.4", now);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.message).toContain("모두 소진");
  });

  it("다른 날(한국 시간)이 되면 새로 센다", async () => {
    await take("1.1.1.1", 3 * PARTS_PER_REPORT);
    const tomorrow = new Date(now.getTime() + 24 * 3_600_000);
    expect((await takeFreeQuota("1.1.1.1", tomorrow)).ok).toBe(true);
  });

  it("IP는 x-forwarded-for의 첫 값", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
