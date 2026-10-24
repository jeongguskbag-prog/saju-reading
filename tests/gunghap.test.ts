import { beforeEach, describe, expect, it } from "vitest";
import { calculateSaju, type BirthInput } from "@/lib/saju/calc";
import { branchRelation, stemRelation } from "@/lib/extras/relations";
import { computeGunghap, gunghapPrompt } from "@/lib/extras/gunghap";
import { parseExtraRequest } from "@/lib/extras/requests";
import { extraRequestSummary } from "@/lib/extras/summary";
import { createOrder, OrderError } from "@/lib/orders";
import { orderRow } from "@/lib/admin";
import { createMemoryStore, setStoreForTest } from "@/lib/store";

const now = new Date("2026-10-15T03:00:00Z");
const me: BirthInput = { name: "홍길동", gender: "male", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 };
const partner = { name: "김하나", gender: "female" as const, calendar: "solar" as const, year: 1992, month: 3, day: 4, hour: 7, minute: 30 };

describe("합충", () => {
  it("천간합·천간충", () => {
    expect(stemRelation("甲", "己").map((r) => r.name)).toEqual(["천간합(토)"]);
    expect(stemRelation("甲", "庚").map((r) => r.name)).toContain("천간충");
  });
  it("지지 육합·충·원진", () => {
    expect(branchRelation("子", "丑").map((r) => r.name)).toContain("육합");
    expect(branchRelation("子", "午").map((r) => r.name)).toContain("충");
    expect(branchRelation("子", "未").map((r) => r.name)).toContain("원진");
  });
});

describe("연분록 계산", () => {
  const a = calculateSaju(me, now);
  const b = calculateSaju(partner, now);
  const c = computeGunghap(a, "홍길동", b, "김하나", "couple", now);

  it("점수는 항목 합이고 100점 안", () => {
    expect(c.total).toBe(c.scores.reduce((s, x) => s + x.score, 0));
    expect(c.total).toBeGreaterThan(0);
    expect(c.total).toBeLessThanOrEqual(100);
    for (const s of c.scores) expect(s.score).toBeLessThanOrEqual(s.max);
  });

  it("두 사람의 일주·년주를 그대로 쓴다", () => {
    expect(c.spouse.a).toBe(a.pillars.day.branch);
    expect(c.spouse.b).toBe(b.pillars.day.branch);
    expect(c.a.dayMaster.stem).toBe(a.dayMaster.stem);
    expect(c.timeline).toHaveLength(7);
    expect(c.timeline[0].year).toBe(2026);
  });

  it("같은 입력이면 같은 결과, 순서를 바꿔도 총점은 같다", () => {
    const again = computeGunghap(a, "홍길동", b, "김하나", "couple", now);
    expect(again).toEqual(c);
    const swapped = computeGunghap(b, "김하나", a, "홍길동", "couple", now);
    expect(swapped.total).toBe(c.total);
  });

  it("AI에 넘기는 값에 두 명식과 점수가 들어간다", () => {
    const p = gunghapPrompt(c);
    expect(JSON.stringify(p)).toContain(a.pillars.day.stem + a.pillars.day.branch);
    expect(JSON.stringify(p)).toContain(`합계 ${c.total}/100`);
  });
});

describe("연분록 주문", () => {
  beforeEach(() => setStoreForTest(createMemoryStore()));

  it("상대 정보가 없으면 주문을 만들지 않는다", async () => {
    await expect(createOrder(me, "a@b.co", "gunghap", now, undefined, "01012345678", ["email"], {})).rejects.toBeInstanceOf(OrderError);
  });

  it("신청서를 주문에 저장하고 관리 표에 한 줄로 보인다", async () => {
    const order = await createOrder(me, "a@b.co", "gunghap", now, undefined, "01012345678", ["email"], { relation: "married", partner });
    expect(order.amount).toBe(16900);
    expect(order.extra?.kind).toBe("gunghap");
    const row = orderRow(order, "https://x.test");
    expect(row["추가 신청"]).toContain("부부");
    expect(row["추가 신청"]).toContain("김하나");
  });

  it("검사기와 요약", () => {
    expect(parseExtraRequest("gunghap", { relation: "couple", partner: { ...partner, name: "" } }).ok).toBe(false);
    expect(extraRequestSummary("gunghap", { relation: "business", partner })).toBe("동업·협업 · 상대 김하나 여 · 1992년 3월 4일 07:30 (양력)");
  });
});
