import { describe, expect, it } from "vitest";
import { familyRows, revisitNotices } from "@/lib/revisit";
import { newyearSeason } from "@/lib/season";
import type { SavedProfile } from "@/lib/member";
import type { Order } from "@/lib/orders";

const prof = (id: string, name: string, year: number, self = false): SavedProfile => ({
  id,
  self,
  savedAt: "2026-01-01T00:00:00Z",
  input: { name, gender: "male", calendar: "solar", year, month: 5, day: 15, hour: 10, minute: 30 },
});
const order = (paidAt: string, extra?: Order["extra"]): Order =>
  ({ id: paidAt, status: "paid", paidAt, createdAt: paidAt, amount: 1, orderName: "x", customerKey: "k", email: "", input: {}, ...(extra ? { extra } : {}) }) as unknown as Order;

describe("마이 재방문 기능", () => {
  it("가족 사주 표: 띠·일간·용신·오늘 운세, 내 사주와의 관계", () => {
    const rows = familyRows([prof("a", "나", 1990, true), prof("b", "엄마", 1962), prof("c", "동생", 1994)], new Date("2026-10-21T03:00:00Z"));
    expect(rows).toHaveLength(3);
    expect(rows[0].animal).toBe("말띠");
    expect(rows[0].withMe).toBeNull();
    expect(rows[1].withMe).not.toBeNull();
    expect(rows[1].dayMaster).toMatch(/\(.\)$/);
    expect(["좋음", "보통", "주의"]).toContain(rows[2].todayMark);
  });

  it("신년 시즌에는 그해 신년 운세가 없을 때만 안내한다", () => {
    const now = new Date("2026-11-20T03:00:00Z");
    const season = newyearSeason(now, undefined)!;
    expect(season.year).toBe(2027);
    expect(revisitNotices([], season, now).map((n) => n.key)).toEqual(["newyear"]);
    const had = order("2026-11-18T00:00:00Z", { kind: "newyear", request: { year: 2027 } });
    expect(revisitNotices([had], season, now).map((n) => n.key)).toEqual([]);
  });

  it("마지막 감정서가 1년 가까이 지나면 다시 보기를 안내한다", () => {
    const now = new Date("2026-10-21T03:00:00Z");
    expect(revisitNotices([order("2025-10-01T00:00:00Z")], null, now).map((n) => n.key)).toEqual(["anniversary"]);
    expect(revisitNotices([order("2025-10-01T00:00:00Z"), order("2026-05-01T00:00:00Z")], null, now)).toEqual([]);
  });
});
