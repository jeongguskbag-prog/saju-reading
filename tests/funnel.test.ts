import { beforeEach, describe, expect, it } from "vitest";
import { funnelDays, trackStep } from "@/lib/funnel";
import { createMemoryStore, setStoreForTest } from "@/lib/store";

beforeEach(() => setStoreForTest(createMemoryStore()));

describe("방문·결제 흐름", () => {
  it("같은 방문자는 하루 한 번, 서버 단계는 그때마다 센다", async () => {
    const now = new Date("2026-10-21T03:00:00Z");
    await trackStep("visit", "abcdefgh1", now);
    await trackStep("visit", "abcdefgh1", now);
    await trackStep("visit", "abcdefgh2", now);
    await trackStep("checkout", undefined, now);
    await trackStep("checkout", undefined, now);
    await trackStep("visit", "bad id!", now);
    const [today] = await funnelDays(2, now);
    expect(today.day).toBe("2026-10-21");
    expect(today.counts.visit).toBe(2);
    expect(today.counts.checkout).toBe(2);
    expect(today.counts.paid).toBe(0);
  });
});
