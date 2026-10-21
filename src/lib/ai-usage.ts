// AI 사용량(토큰)과 추정 비용 기록(서버 전용). 감정서 주문별·날짜별로 남겨 관리 화면에서 본다.
// 비용은 추정치: 단가(백만 토큰당 달러)는 AI_PRICE_USD="입력,출력" (기본 4,20), 환율은 AI_KRW_PER_USD (기본 1400)로 바꿀 수 있다.
import { AsyncLocalStorage } from "node:async_hooks";
import { getStore } from "./store";

export interface UsageContext {
  /** 감정서 주문번호(있으면 주문별로도 모은다) */
  orderId?: string;
  /** 무엇에 썼는지: report, consult, free 등 */
  kind: string;
}

export interface UsageEntry {
  k: string;
  o?: string;
  m: string;
  /** 입력·출력·캐시 쓰기·캐시 읽기 토큰 */
  i: number;
  out: number;
  cw: number;
  cr: number;
  t: string;
}

interface RawUsage {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

const als = new AsyncLocalStorage<UsageContext>();

export function withUsageContext<T>(ctx: UsageContext, fn: () => Promise<T>): Promise<T> {
  return als.run(ctx, fn);
}

const kstDay = (d = new Date()) => new Date(d.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);
export const orderUsageKey = (orderId: string) => `ai-usage:order:${orderId}`;
export const dayUsageKey = (day: string) => `ai-usage:day:${day}`;

/** AI 응답의 usage를 기록한다. 기록 실패는 무시한다(본 작업을 막지 않는다). */
export async function recordUsage(usage: RawUsage | null | undefined, model: string, fallbackKind = "other"): Promise<void> {
  if (!usage) return;
  const store = getStore();
  if (!store) return;
  const ctx = als.getStore();
  const entry: UsageEntry = {
    k: ctx?.kind ?? fallbackKind,
    ...(ctx?.orderId ? { o: ctx.orderId } : {}),
    m: model,
    i: usage.input_tokens ?? 0,
    out: usage.output_tokens ?? 0,
    cw: usage.cache_creation_input_tokens ?? 0,
    cr: usage.cache_read_input_tokens ?? 0,
    t: new Date().toISOString(),
  };
  const line = JSON.stringify(entry);
  await Promise.all([
    ctx?.orderId ? store.listPush(orderUsageKey(ctx.orderId), line) : Promise.resolve(),
    store.listPush(dayUsageKey(kstDay()), line),
  ]).catch((error) => console.error("AI 사용량을 기록하지 못했습니다", error));
}

function prices(raw = process.env.AI_PRICE_USD): { input: number; output: number } {
  const [a, b] = (raw ?? "").split(",").map((s) => Number(s.trim()));
  return { input: Number.isFinite(a) && a > 0 ? a : 4, output: Number.isFinite(b) && b > 0 ? b : 20 };
}
const krwPerUsd = () => {
  const n = Number(process.env.AI_KRW_PER_USD);
  return Number.isFinite(n) && n > 0 ? n : 1400;
};

/** 추정 비용(원). 캐시 쓰기는 입력의 1.25배, 캐시 읽기는 0.1배로 본다. */
export function costKrw(entries: Pick<UsageEntry, "i" | "out" | "cw" | "cr">[]): number {
  const p = prices();
  const usd = entries.reduce((s, e) => s + ((e.i + e.cw * 1.25 + e.cr * 0.1) * p.input + e.out * p.output) / 1_000_000, 0);
  return Math.round(usd * krwPerUsd());
}

const parse = (lines: string[]): UsageEntry[] =>
  lines.flatMap((l) => {
    try {
      return [JSON.parse(l) as UsageEntry];
    } catch {
      return [];
    }
  });

export async function orderUsage(orderId: string): Promise<{ calls: number; tokens: number; krw: number } | null> {
  const store = getStore();
  if (!store) return null;
  const entries = parse(await store.listRange(orderUsageKey(orderId), 0, 199));
  if (!entries.length) return null;
  return { calls: entries.length, tokens: entries.reduce((s, e) => s + e.i + e.out + e.cw + e.cr, 0), krw: costKrw(entries) };
}

/** 최근 며칠의 날짜별·용도별 추정 비용 */
export async function usageDays(days = 7, now = new Date()): Promise<{ day: string; byKind: Record<string, number>; total: number; calls: number }[]> {
  const store = getStore();
  if (!store) return [];
  const out = [];
  for (let n = 0; n < days; n++) {
    const day = kstDay(new Date(now.getTime() - n * 86_400_000));
    const entries = parse(await store.listRange(dayUsageKey(day), 0, 4999));
    const byKind: Record<string, number> = {};
    for (const e of entries) byKind[e.k] = (byKind[e.k] ?? 0) + costKrw([e]);
    out.push({ day, byKind, total: costKrw(entries), calls: entries.length });
  }
  return out;
}
