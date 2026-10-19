// 회원(카카오 로그인) 정보와 로그인 쿠키, 저장한 사주, 감정서 보관함(서버 전용). AI 상담 질문권은 consult.ts.
// - 회원은 가입하지 않아도 된다. 가입하면 사주 저장·감정서 평생 보관·오늘의 운세·AI 상담 무료 질문을 준다.
// - 카카오에서는 회원 번호와 닉네임만 받는다. 카카오 접속 토큰은 저장하지 않는다.
// - 탈퇴하면 회원 정보와 저장한 사주·AI 상담 대화를 지우고, 보관함의 감정서는 일반 주문처럼 열람 기간이 지나면 지워지게 되돌린다.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { REPORT_VALID_DAYS } from "./product";
import { getOrder, getSavedPart, productOf, savePart, type Order } from "./orders";
import type { BirthInput } from "./saju/calc";
import { normalizePhone } from "./sms";
import { getStore, requireStore } from "./store";
import { REPORT_BONUS_QUESTIONS, REVIEW_BONUS_QUESTIONS } from "./consult-copy";

export const MEMBER_COOKIE = "chungirok_member";
/** 로그인 유지 기간 */
export const SESSION_DAYS = 30;
/** 저장할 수 있는 사주 수 */
export const MAX_PROFILES = 10;
export { REPORT_BONUS_QUESTIONS };

/** 가입 혜택: AI 상담 무료 질문 수 */
export const WELCOME_QUESTIONS = 3;

export interface SavedProfile {
  id: string;
  input: BirthInput;
  /** 오늘의 운세에 쓰는 '내 사주'. 처음 저장한 사주가 내 사주가 된다. */
  self: boolean;
  savedAt: string;
}

export interface Member {
  id: string;
  provider: "kakao";
  providerId: string;
  nickname: string;
  createdAt: string;
  profiles: SavedProfile[];
  /** 보관함의 주문번호(최근 것이 앞) */
  orderIds: string[];
  /** AI 상담 무료 질문 남은 수 */
  freeQuestions: number;
  /** 산 AI 상담 질문권 남은 수 */
  paidQuestions?: number;
}

export class MemberError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const memberKey = (id: string) => `member:${id}`;
const providerKey = (provider: string, providerId: string) => `member:${provider}:${providerId}`;

const secret = () => process.env.MEMBER_SESSION_SECRET ?? "";

/** 카카오 앱 키·로그인 쿠키 서명 키·저장소가 모두 있어야 회원 기능을 연다. */
export const isMemberEnabled = () => memberSetupMissing().length === 0;

/** 회원 기능을 켜는 데 빠진 설정(이름만, 값은 드러내지 않는다). 마이 화면이 사장님께 알려 준다. */
export function memberSetupMissing(): string[] {
  const missing: string[] = [];
  if (!process.env.KAKAO_REST_API_KEY?.trim()) missing.push("KAKAO_REST_API_KEY");
  if (!secret()) missing.push("MEMBER_SESSION_SECRET");
  else if (secret().length < 32) missing.push(`MEMBER_SESSION_SECRET(32자 이상 필요, 지금 ${secret().length}자)`);
  if (!getStore()) missing.push("저장소(Upstash KV)");
  return missing;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

/** 로그인 쿠키 값: 회원번호.만료시각.서명 */
export function sessionValue(memberId: string, now = new Date()): string {
  const payload = `${memberId}.${Math.floor(now.getTime() / 1000) + SESSION_DAYS * 86400}`;
  return `${payload}.${sign(payload)}`;
}

/** 쿠키가 맞으면 회원번호, 아니면 null */
export function memberIdFromSession(value: string | undefined, now = new Date()): string | null {
  if (!value || secret().length < 32) return null;
  const [id, exp, sig] = value.split(".");
  if (!id || !exp || !sig) return null;
  const want = Buffer.from(sign(`${id}.${exp}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return Number(exp) * 1000 > now.getTime() ? id : null;
}

export function sessionCookie(memberId: string, secure: boolean): string {
  return `${MEMBER_COOKIE}=${sessionValue(memberId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`;
}
export const clearSessionCookie = () => `${MEMBER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/** 요청의 쿠키 머리글에서 로그인한 회원을 찾는다. */
export async function memberFromRequest(request: Request): Promise<Member | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${MEMBER_COOKIE}=`))
    ?.slice(MEMBER_COOKIE.length + 1);
  return memberFromCookie(value);
}

export async function memberFromCookie(value: string | undefined): Promise<Member | null> {
  const id = memberIdFromSession(value);
  return id ? getMember(id) : null;
}

export async function getMember(id: string): Promise<Member | null> {
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(id)) return null;
  return (await getStore()?.get<Member>(memberKey(id))) ?? null;
}

const saveMember = (m: Member) => requireStore().set(memberKey(m.id), m);

/** 카카오 회원번호로 찾고, 없으면 새로 만든다(가입 혜택 포함). */
export async function findOrCreateMember(provider: "kakao", providerId: string, nickname: string, now = new Date()): Promise<{ member: Member; created: boolean }> {
  const store = requireStore();
  const existing = await store.get<string>(providerKey(provider, providerId));
  if (existing) {
    const m = await getMember(existing);
    if (m) {
      // 카카오에서 닉네임을 바꿨으면 따라간다.
      if (nickname && m.nickname !== nickname) await saveMember({ ...m, nickname });
      return { member: { ...m, nickname: nickname || m.nickname }, created: false };
    }
  }
  const member: Member = {
    id: randomBytes(12).toString("base64url"),
    provider,
    providerId,
    nickname: nickname || "회원",
    createdAt: now.toISOString(),
    profiles: [],
    orderIds: [],
    freeQuestions: WELCOME_QUESTIONS,
  };
  // 동시에 두 번 눌러도 회원이 하나만 생기게 한다.
  if (!(await store.setIfAbsent(providerKey(provider, providerId), member.id))) {
    const id = await store.get<string>(providerKey(provider, providerId));
    const m = id ? await getMember(id) : null;
    if (m) return { member: m, created: false };
  }
  await saveMember(member);
  return { member, created: true };
}

// ── 저장한 사주 ──

export async function addProfile(memberId: string, input: BirthInput, now = new Date()): Promise<SavedProfile> {
  const m = await getMember(memberId);
  if (!m) throw new MemberError("로그인이 필요합니다.", 401);
  if (m.profiles.length >= MAX_PROFILES) throw new MemberError(`사주는 ${MAX_PROFILES}개까지 저장할 수 있습니다. 쓰지 않는 사주를 지운 뒤 저장해 주세요.`);
  const same = m.profiles.find((p) => JSON.stringify(p.input) === JSON.stringify(input));
  if (same) return same;
  const profile: SavedProfile = { id: randomBytes(6).toString("base64url"), input, self: m.profiles.length === 0, savedAt: now.toISOString() };
  await saveMember({ ...m, profiles: [...m.profiles, profile] });
  return profile;
}

export async function removeProfile(memberId: string, profileId: string): Promise<void> {
  const m = await getMember(memberId);
  if (!m) throw new MemberError("로그인이 필요합니다.", 401);
  const rest = m.profiles.filter((p) => p.id !== profileId);
  // 내 사주를 지우면 다음 사주가 내 사주가 된다.
  if (rest.length && !rest.some((p) => p.self)) rest[0] = { ...rest[0], self: true };
  await saveMember({ ...m, profiles: rest });
  // 이 사주로 나눈 AI 상담 대화도 지운다.
  await requireStore().del(`consult:${m.id}:${profileId}`);
}

export async function setSelfProfile(memberId: string, profileId: string): Promise<void> {
  const m = await getMember(memberId);
  if (!m) throw new MemberError("로그인이 필요합니다.", 401);
  if (!m.profiles.some((p) => p.id === profileId)) throw new MemberError("저장한 사주를 찾지 못했습니다.", 404);
  await saveMember({ ...m, profiles: m.profiles.map((p) => ({ ...p, self: p.id === profileId })) });
}

// ── 감정서 보관함 ──

const DAY = 86_400_000;

/** 주문의 풀이를 기한 없이 두거나(keep), 일반 주문처럼 열람 기간이 지나면 지워지게 되돌린다. */
async function setPartsRetention(order: Order, keep: boolean, now = new Date()): Promise<void> {
  if (!order.token) return;
  const paidAt = new Date(order.paidAt ?? order.createdAt).getTime();
  const expiresAt = new Date(paidAt + REPORT_VALID_DAYS * DAY).toISOString();
  for (const part of productOf(order).parts) {
    const saved = await getSavedPart(order.token, part);
    if (!saved) continue;
    if (keep) await savePart(order.token, part, saved);
    else if (paidAt + REPORT_VALID_DAYS * DAY + DAY < now.getTime()) await requireStore().del(`report:${order.token}:part:${part}`);
    else await savePart(order.token, part, saved, expiresAt, now);
  }
}

/** 결제한 주문을 회원 보관함에 넣는다. 보관함의 감정서는 열람 기간 없이 계속 열 수 있다. */
export async function linkOrder(memberId: string, orderId: string): Promise<Order> {
  const m = await getMember(memberId);
  if (!m) throw new MemberError("로그인이 필요합니다.", 401);
  const order = await getOrder(orderId);
  if (!order || order.status !== "paid" || !order.token) throw new MemberError("결제가 끝난 주문을 찾지 못했습니다.", 404);
  if (order.gift) throw new MemberError("선물 주문은 보관함에 넣을 수 없습니다. 받는 분이 선물 링크에서 받은 감정서를 넣어 주세요.", 400);
  if (order.questionPack) throw new MemberError("감정서 주문이 아닙니다.", 400);
  if (order.memberId && order.memberId !== memberId) throw new MemberError("다른 회원의 보관함에 있는 감정서입니다.", 409);
  const linked: Order = { ...order, memberId };
  await requireStore().set(`order:${order.id}`, linked);
  await setPartsRetention(linked, true);
  if (!m.orderIds.includes(order.id)) await saveMember({ ...m, orderIds: [order.id, ...m.orderIds].slice(0, 200) });
  await grantReportBonus(memberId, linked).catch((error) => console.error("감정서 보너스 질문을 넣지 못했습니다", error));
  return linked;
}

/** 회원 보관함의 감정서에 처음 후기를 남기면(주문마다 한 번) AI 상담 무료 질문을 준다. 준 수를 돌려준다. */
export async function grantReviewBonus(order: Order, now = new Date()): Promise<number> {
  if (!order.memberId || order.questionPack) return 0;
  if (!(await requireStore().setIfAbsent(`review-bonus:${order.id}`, now.toISOString(), 60 * 60 * 24 * 400))) return 0;
  const m = await getMember(order.memberId);
  if (!m) return 0;
  await saveMember({ ...m, freeQuestions: m.freeQuestions + REVIEW_BONUS_QUESTIONS });
  return REVIEW_BONUS_QUESTIONS;
}

/**
 * 감정서를 보관함에 처음 넣을 때(주문마다 한 번) AI 상담 무료 질문을 주고,
 * 감정서의 사주를 저장해 두어 바로 AI 상담에서 이어 물을 수 있게 한다.
 */
async function grantReportBonus(memberId: string, order: Order, now = new Date()): Promise<boolean> {
  if (order.questionPack) return false;
  if (!(await requireStore().setIfAbsent(`report-bonus:${order.id}`, now.toISOString(), 60 * 60 * 24 * 400))) return false;
  const m = await getMember(memberId);
  if (!m) return false;
  const has = m.profiles.some((p) => JSON.stringify(p.input) === JSON.stringify(order.input));
  const profiles =
    has || m.profiles.length >= MAX_PROFILES
      ? m.profiles
      : [...m.profiles, { id: randomBytes(6).toString("base64url"), input: order.input, self: m.profiles.length === 0, savedAt: now.toISOString() }];
  await saveMember({ ...m, profiles, freeQuestions: m.freeQuestions + REPORT_BONUS_QUESTIONS });
  return true;
}

/** 주문 조회처럼 주문번호와 연락처(이메일·휴대폰)가 맞을 때만 보관함에 넣는다. */
export async function claimOrder(memberId: string, orderIdRaw: string, contactRaw: string): Promise<Order> {
  const orderId = orderIdRaw.trim().toUpperCase().replace(/^CGR(\d)/, "CGR-$1").replace(/^(CGR-\d{8}-)([0-9A-F]+)$/, (_, a: string, b: string) => a + b.toLowerCase());
  const contact = contactRaw.trim();
  const order = orderId && contact ? await getOrder(orderId) : null;
  const phone = normalizePhone(contact);
  const matches = order && ((phone && order.phone && phone === order.phone) || (order.email && contact.toLowerCase() === order.email.toLowerCase()));
  if (!order || !matches) throw new MemberError("주문번호와 연락처가 맞는 주문을 찾지 못했습니다. 주문할 때 적은 이메일이나 휴대폰 번호를 확인해 주세요.", 404);
  return linkOrder(memberId, order.id);
}

export async function memberOrders(m: Member): Promise<Order[]> {
  const orders = await Promise.all(m.orderIds.map((id) => getOrder(id)));
  return orders.filter((o): o is Order => Boolean(o && o.memberId === m.id && o.token && o.status === "paid" && !o.gift));
}

/** 회원 탈퇴: 회원 정보·저장한 사주를 지우고, 보관함 감정서는 일반 주문의 보관 기간으로 되돌린다. */
export async function deleteMember(memberId: string, now = new Date()): Promise<Member | null> {
  const m = await getMember(memberId);
  if (!m) return null;
  const store = requireStore();
  for (const id of m.orderIds) {
    const order = await getOrder(id);
    if (!order || order.memberId !== m.id) continue;
    const { memberId: _drop, ...rest } = order;
    void _drop;
    await store.set(`order:${order.id}`, rest);
    await setPartsRetention(rest, false, now);
  }
  for (const p of m.profiles) await store.del(`consult:${m.id}:${p.id}`);
  await store.del(providerKey(m.provider, m.providerId));
  await store.del(memberKey(m.id));
  return m;
}
