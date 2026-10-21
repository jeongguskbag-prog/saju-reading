// 방문·결제 흐름 측정(서버 전용). 개인정보 없이 날짜별 단계 수만 센다.
// 화면 단계(visit·chart·choose)는 방문자 임의 번호로 하루 한 번만 세고, 주문·결제는 서버에서 센다.
import { getStore } from "./store";

export const FUNNEL_STEPS = ["visit", "chart", "choose", "checkout", "paid"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];
export const CLIENT_STEPS: FunnelStep[] = ["visit", "chart", "choose"];
export const FUNNEL_LABEL: Record<FunnelStep, string> = {
  visit: "첫 화면 방문",
  chart: "무료 사주 보기",
  choose: "감정서 고르기 화면",
  checkout: "결제창 열기(주문)",
  paid: "결제 완료",
};

const KEEP = 60 * 60 * 24 * 120; // 120일
export const kstDay = (now = new Date()) => new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);

/** 한 단계를 센다. visitor가 있으면 같은 날 같은 사람은 한 번만. 실패해도 조용히 넘어간다. */
export async function trackStep(step: FunnelStep, visitor?: string, now = new Date()): Promise<void> {
  const store = getStore();
  if (!store) return;
  const day = kstDay(now);
  try {
    if (visitor) {
      if (!/^[A-Za-z0-9_-]{8,40}$/.test(visitor)) return;
      if (!(await store.setIfAbsent(`funnel-seen:${day}:${step}:${visitor}`, 1, 60 * 60 * 48))) return;
    }
    await store.incr(`funnel:${day}:${step}`, KEEP);
  } catch {
    // 측정 실패는 손님 흐름을 막지 않는다.
  }
}

export interface FunnelDay {
  day: string;
  counts: Record<FunnelStep, number>;
}

/** 최근 며칠의 단계별 수(최근 날짜가 앞) */
export async function funnelDays(days = 14, now = new Date()): Promise<FunnelDay[]> {
  const store = getStore();
  if (!store) return [];
  const daysList = Array.from({ length: days }, (_, i) => kstDay(new Date(now.getTime() - i * 86_400_000)));
  const out: FunnelDay[] = await Promise.all(
    daysList.map(async (day) => {
      const values = await Promise.all(FUNNEL_STEPS.map((step) => store.get<number | string>(`funnel:${day}:${step}`).catch(() => 0)));
      const counts = Object.fromEntries(FUNNEL_STEPS.map((step, i) => [step, Number(values[i] ?? 0) || 0])) as Record<FunnelStep, number>;
      return { day, counts };
    }),
  );
  return out;
}
