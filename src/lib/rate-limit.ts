// 무료 풀이(앱 전용 화면·FREE_READING) 요청 횟수 제한. 결제한 감정서는 제한하지 않는다.
// 감정서 한 부는 AI 호출 6번(발간사 + 5개 파트)이라 "부" 단위 한도에 6을 곱해 센다.
import { createMemoryStore, getStore, type Store } from "./store";
import type { Locale } from "./saju/locale";

export const PARTS_PER_REPORT = 6;

/** 한도(감정서 부 수). Vercel 환경변수로 바꿀 수 있다. */
export function freeLimits() {
  const num = (name: string, fallback: number) => {
    const n = Number(process.env[name]);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  };
  return {
    /** 같은 기기(IP)에서 1시간에 */
    perIpHour: num("FREE_LIMIT_PER_HOUR", 3),
    /** 같은 기기(IP)에서 하루에 */
    perIpDay: num("FREE_LIMIT_PER_DAY", 5),
    /** 서비스 전체에서 하루에(API 요금 상한) */
    globalDay: num("FREE_LIMIT_GLOBAL_PER_DAY", 50),
  };
}

// 저장소(Upstash)가 없을 때는 서버 인스턴스 안에서라도 센다(인스턴스마다 따로 세므로 느슨한 제한).
let fallback: Store | null = null;
const counterStore = () => getStore() ?? (fallback ??= createMemoryStore());

/** 한국 시간 기준 날짜·시각 키. */
function kstKeys(now: Date) {
  const kst = new Date(now.getTime() + 9 * 3_600_000).toISOString(); // 2026-10-15T08:...
  return { day: kst.slice(0, 10), hour: kst.slice(0, 13) };
}

/** 요청자의 IP. Vercel은 x-forwarded-for 첫 값에 실제 접속 IP를 넣는다. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

export type QuotaResult = { ok: true } | { ok: false; message: string };

/**
 * 무료 풀이 파트 요청 하나를 센다. 한도를 넘으면 ok: false와 안내 문구를 돌려준다.
 * 각 한도에는 감정서 한 부만큼(6회)의 여유를 더해, 실패한 파트를 다시 써도 바로 막히지 않게 한다.
 */
const MESSAGES = {
  ko: {
    global: "오늘 준비된 무료 풀이가 모두 소진되었습니다. 내일 다시 이용해 주세요.",
    day: (n: number) => `무료 풀이는 하루 ${n}회까지 이용할 수 있습니다. 내일 다시 이용해 주세요.`,
    hour: (n: number) => `무료 풀이는 1시간에 ${n}회까지 이용할 수 있습니다. 잠시 후 다시 시도해 주세요.`,
  },
  "zh-Hant": {
    global: "今日的免費解讀名額已全部用完，請明天再來。",
    day: (n: number) => `免費解讀每天最多可使用 ${n} 次，請明天再來。`,
    hour: (n: number) => `免費解讀每小時最多可使用 ${n} 次，請稍後再試。`,
  },
} satisfies Record<Locale, unknown>;

export async function takeFreeQuota(ip: string, now = new Date(), locale: Locale = "ko"): Promise<QuotaResult> {
  const M = MESSAGES[locale];
  const limits = freeLimits();
  const { day, hour } = kstKeys(now);
  const store = counterStore();
  const cap = (reports: number) => reports * PARTS_PER_REPORT + PARTS_PER_REPORT;

  const global = await store.incr(`rl:free:all:${day}`, 2 * 86_400);
  if (global > cap(limits.globalDay)) {
    return { ok: false, message: M.global };
  }
  const ipDay = await store.incr(`rl:free:ip:${day}:${ip}`, 2 * 86_400);
  if (ipDay > cap(limits.perIpDay)) {
    return { ok: false, message: M.day(limits.perIpDay) };
  }
  const ipHour = await store.incr(`rl:free:iph:${hour}:${ip}`, 2 * 3_600);
  if (ipHour > cap(limits.perIpHour)) {
    return { ok: false, message: M.hour(limits.perIpHour) };
  }
  return { ok: true };
}
