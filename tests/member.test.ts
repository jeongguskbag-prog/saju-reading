import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BirthInput } from "@/lib/saju/calc";
import { calculateSaju } from "@/lib/saju/calc";
import { confirmOrder, createOrder, getOrder, getReport, savePart } from "@/lib/orders";
import {
  addProfile,
  claimOrder,
  deleteMember,
  findOrCreateMember,
  getMember,
  isMemberEnabled,
  MAX_PROFILES,
  memberIdFromSession,
  memberOrders,
  removeProfile,
  sessionValue,
  setSelfProfile,
  REPORT_BONUS_QUESTIONS,
  WELCOME_QUESTIONS,
} from "@/lib/member";
import { safeNext } from "@/lib/kakao-login";
import { dailyFortune } from "@/lib/saju/daily";
import { createMemoryStore, setStoreForTest, type Store } from "@/lib/store";

const input: BirthInput = { name: "홍길동", gender: "female", calendar: "solar", year: 1978, month: 8, day: 8, hour: 10, minute: 0 };
const now = new Date("2026-10-15T03:00:00Z");
let store: Store;

function tossReply(body: object) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
}

async function paidOrder(memberId?: string) {
  const order = await createOrder(input, "a@b.co", "core", now, undefined, "010-1234-5678", ["email"], undefined, memberId);
  vi.stubGlobal("fetch", tossReply({ orderId: order.id, status: "DONE", totalAmount: order.amount, approvedAt: "2026-10-15T12:00:00+09:00" }));
  return (await confirmOrder({ paymentKey: `pk_${order.id}`, orderId: order.id, amount: order.amount }, now)).order;
}

beforeEach(() => {
  store = createMemoryStore();
  setStoreForTest(store);
  vi.stubEnv("TOSS_SECRET_KEY", "test_sk_dummy");
  vi.stubEnv("KAKAO_REST_API_KEY", "kakao-test-key");
  vi.stubEnv("MEMBER_SESSION_SECRET", "x".repeat(40));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("로그인 쿠키", () => {
  it("서명이 맞고 기한 안이면 회원번호를 돌려준다", () => {
    const v = sessionValue("member_abc123", now);
    expect(memberIdFromSession(v, now)).toBe("member_abc123");
    expect(memberIdFromSession(v, new Date(now.getTime() + 31 * 86_400_000))).toBeNull();
    expect(memberIdFromSession(v.replace("member_abc123", "member_zzz999"), now)).toBeNull();
    expect(memberIdFromSession(v.slice(0, -2) + "xx", now)).toBeNull();
    expect(memberIdFromSession(undefined, now)).toBeNull();
  });

  it("서명 키가 짧으면 회원 기능을 열지 않는다", () => {
    vi.stubEnv("MEMBER_SESSION_SECRET", "short");
    expect(isMemberEnabled()).toBe(false);
    expect(memberIdFromSession(sessionValue("member_abc123"), now)).toBeNull();
  });

  it("로그인 뒤에는 우리 사이트 안으로만 돌아간다", () => {
    expect(safeNext("/my")).toBe("/my");
    expect(safeNext("/my/p/abc?x=1")).toBe("/my/p/abc?x=1");
    expect(safeNext("//evil.com")).toBe("/my");
    expect(safeNext("https://evil.com")).toBe("/my");
    expect(safeNext(null)).toBe("/my");
  });
});

describe("회원", () => {
  it("같은 카카오 회원은 한 번만 가입되고 가입 혜택을 받는다", async () => {
    const a = await findOrCreateMember("kakao", "12345", "길동");
    const b = await findOrCreateMember("kakao", "12345", "길동이");
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.member.id).toBe(a.member.id);
    expect(b.member.nickname).toBe("길동이");
    expect(a.member.freeQuestions).toBe(WELCOME_QUESTIONS);
  });

  it("사주를 저장하고, 처음 저장한 사주가 내 사주가 된다", async () => {
    const { member } = await findOrCreateMember("kakao", "1", "a");
    const p1 = await addProfile(member.id, input);
    const p2 = await addProfile(member.id, { ...input, name: "엄마", year: 1955 });
    expect(await addProfile(member.id, input)).toEqual(p1); // 같은 사주는 한 번만
    let m = await getMember(member.id);
    expect(m?.profiles.map((p) => p.self)).toEqual([true, false]);
    await setSelfProfile(member.id, p2.id);
    m = await getMember(member.id);
    expect(m?.profiles.find((p) => p.self)?.id).toBe(p2.id);
    await removeProfile(member.id, p2.id);
    m = await getMember(member.id);
    expect(m?.profiles).toHaveLength(1);
    expect(m?.profiles[0].self).toBe(true);
  });

  it(`사주는 ${MAX_PROFILES}개까지`, async () => {
    const { member } = await findOrCreateMember("kakao", "2", "a");
    for (let i = 0; i < MAX_PROFILES; i++) await addProfile(member.id, { ...input, year: 1960 + i });
    await expect(addProfile(member.id, { ...input, year: 2001 })).rejects.toThrow(`${MAX_PROFILES}개`);
  });
});

describe("감정서 보관함", () => {
  it("로그인하고 산 감정서는 보관함에 들어가고 열람 기간이 없다", async () => {
    const { member } = await findOrCreateMember("kakao", "3", "a");
    const order = await paidOrder(member.id);
    expect((await memberOrders((await getMember(member.id))!)).map((o) => o.id)).toEqual([order.id]);
    const later = new Date(now.getTime() + 400 * 86_400_000);
    const report = await getReport(order.token!, later);
    expect(report?.kept).toBe(true);
    expect(report?.expired).toBe(false);
  });

  it("비회원 주문은 주문번호와 연락처가 맞아야 보관함에 넣을 수 있고, 풀이를 기한 없이 다시 저장한다", async () => {
    const { member } = await findOrCreateMember("kakao", "4", "a");
    const order = await paidOrder();
    await savePart(order.token!, "part1", { part: "part1" } as never, (await getReport(order.token!, now))!.expiresAt, now);
    const set = vi.spyOn(store, "set");
    await expect(claimOrder(member.id, order.id, "wrong@b.co")).rejects.toThrow("찾지 못했습니다");
    await claimOrder(member.id, order.id.toUpperCase(), "010-1234-5678");
    expect(set).toHaveBeenCalledWith(`report:${order.token}:part:part1`, { part: "part1" }, undefined);
    expect((await getOrder(order.id))?.memberId).toBe(member.id);
    // 다른 회원은 넣을 수 없다.
    const other = await findOrCreateMember("kakao", "5", "b");
    await expect(claimOrder(other.member.id, order.id, "a@b.co")).rejects.toThrow("다른 회원");
  });

  it("감정서를 보관함에 넣으면 주문마다 한 번 AI 상담 무료 질문을 주고 감정서 사주를 저장한다", async () => {
    const { member } = await findOrCreateMember("kakao", "7", "a");
    const order = await paidOrder();
    await claimOrder(member.id, order.id, "a@b.co");
    let m = (await getMember(member.id))!;
    expect(m.freeQuestions).toBe(WELCOME_QUESTIONS + REPORT_BONUS_QUESTIONS);
    expect(m.profiles.map((p) => p.input)).toEqual([input]);
    expect(m.profiles[0].self).toBe(true);
    // 같은 주문을 다시 넣어도 더 주지 않는다.
    await claimOrder(member.id, order.id, "a@b.co");
    m = (await getMember(member.id))!;
    expect(m.freeQuestions).toBe(WELCOME_QUESTIONS + REPORT_BONUS_QUESTIONS);
    expect(m.profiles).toHaveLength(1);
  });

  it("로그인하고 산 감정서도 결제되면 무료 질문을 받는다", async () => {
    const { member } = await findOrCreateMember("kakao", "8", "a");
    await paidOrder(member.id);
    expect((await getMember(member.id))!.freeQuestions).toBe(WELCOME_QUESTIONS + REPORT_BONUS_QUESTIONS);
  });

  it("탈퇴하면 회원 정보를 지우고 보관함 감정서는 일반 열람 기간으로 돌아간다", async () => {
    const { member } = await findOrCreateMember("kakao", "6", "a");
    await addProfile(member.id, input);
    const order = await paidOrder(member.id);
    await deleteMember(member.id, now);
    expect(await getMember(member.id)).toBeNull();
    expect((await getOrder(order.id))?.memberId).toBeUndefined();
    expect((await getReport(order.token!, new Date(now.getTime() + 400 * 86_400_000)))?.expired).toBe(true);
    // 다시 가입하면 새 회원(혜택도 새로)
    const again = await findOrCreateMember("kakao", "6", "a");
    expect(again.created).toBe(true);
    expect(again.member.profiles).toEqual([]);
  });
});

describe("오늘의 운세", () => {
  it("한국 날짜의 일진으로 정하고 같은 날에는 같은 결과", () => {
    const chart = calculateSaju(input, now);
    const a = dailyFortune(chart, new Date("2026-10-17T15:30:00Z")); // 한국 10월 18일 0시 30분
    const b = dailyFortune(chart, new Date("2026-10-18T10:00:00Z"));
    expect(a.date).toBe("2026-10-18");
    expect(a).toEqual(b);
    expect(a.ganzhi).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
    expect(["좋음", "보통", "주의"]).toContain(a.mark);
    expect(a.text.length).toBeGreaterThan(20);
  });
});
