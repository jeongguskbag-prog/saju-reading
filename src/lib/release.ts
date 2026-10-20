// 감정서 공개·발송 시각(서버·화면 공용, 비밀값 없음).
// 결제 직후에는 명식 미리보기만 보여 주고, 감정서 본문은 상품별로 정한 시간이 지난 뒤 화면에 열고 메일·문자로 보낸다.
// 상품별 시간은 RELEASE_MINUTES 설정으로 바꿀 수 있다. 예: "iching=30,newyear=60,full=120" (적지 않은 상품은 기본값)
import type { ProductId } from "./product";

/** 상품별 기본 대기 시간(분) */
export const DEFAULT_RELEASE_MINUTES: Record<ProductId, number> = {
  iching: 30,
  newyear: 60,
  core: 60,
  taekil: 60,
  gunghap: 120,
  ziwei: 120,
  full: 120,
  naming: 180,
};

const KST = 9 * 3_600_000;
const QUIET_START = 22; // 밤 10시부터
const QUIET_END = 8; // 아침 8시까지

/** 설정(RELEASE_MINUTES)을 읽는다. 잘못 적은 값은 무시하고 기본값을 쓴다. */
export function releaseMinutes(productId: ProductId, raw = process.env.RELEASE_MINUTES): number {
  const fallback = DEFAULT_RELEASE_MINUTES[productId] ?? 60;
  if (!raw) return fallback;
  for (const pair of raw.split(",")) {
    const [k, v] = pair.split("=").map((s) => s.trim());
    if (k !== productId) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0 && n <= 7 * 24 * 60) return n;
  }
  return fallback;
}

/** 공개 시각이 밤(22시~8시, 한국 시간)이면 아침 8시로 미룬다. */
export function avoidQuietHours(at: Date): Date {
  const k = new Date(at.getTime() + KST);
  const h = k.getUTCHours();
  if (h >= QUIET_END && h < QUIET_START) return at;
  const morning = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate(), QUIET_END) - KST);
  // 밤 10시 이후면 다음 날 아침, 자정~아침 8시면 그날 아침
  return h >= QUIET_START ? new Date(morning.getTime() + 86_400_000) : morning;
}

/** 결제 시각과 상품으로 감정서 공개·발송 시각을 정한다(안내한 "약 ○시간 후" 그대로, 밤에도 미루지 않는다). */
export function computeReleaseAt(productId: ProductId, paidAt: Date, raw?: string): Date {
  return new Date(paidAt.getTime() + releaseMinutes(productId, raw) * 60_000);
}

/** 손님에게 보여 줄 공개 시각 문구. 예: "오늘 오후 3:10", "내일 오전 8:00", "10월 21일 오전 8:00" */
export function releaseLabel(at: Date | string, now = new Date()): string {
  const t = new Date(typeof at === "string" ? at : at.getTime());
  const k = new Date(t.getTime() + KST);
  const today = new Date(now.getTime() + KST);
  const dayDiff = Math.round(
    (Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / 86_400_000,
  );
  const day = dayDiff === 0 ? "오늘" : dayDiff === 1 ? "내일" : `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
  const h = k.getUTCHours();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${day} ${ampm} ${h12}:${String(k.getUTCMinutes()).padStart(2, "0")}`;
}

/** 대기 시간을 사람 말로: 30분, 1시간, 1시간 30분 */
export function waitLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}

type Timed = { releaseAt?: string; paidAt?: string; createdAt: string };

/** 감정서 본문을 여는 시각. 예전 주문(releaseAt 없음)은 결제 뒤 WEB_REVEAL_MINUTES(기본 3분). */
export function orderReleaseAt(order: Timed): Date {
  if (order.releaseAt) return new Date(order.releaseAt);
  const env = process.env.WEB_REVEAL_MINUTES;
  const raw = env === undefined || env === "" ? NaN : Number(env);
  const minutes = Number.isFinite(raw) && raw >= 0 ? raw : 3;
  return new Date(new Date(order.paidAt ?? order.createdAt).getTime() + minutes * 60_000);
}

export const isReleased = (order: Timed, now = new Date()) => now.getTime() >= orderReleaseAt(order).getTime();

/** 손님 안내용 대기 시간: "약 1시간 후"의 "1시간" (결제~공개 사이, 30분 단위로 반올림) */
export function orderWaitLabel(order: Timed): string {
  const paid = new Date(order.paidAt ?? order.createdAt).getTime();
  const min = Math.max(0, Math.round((orderReleaseAt(order).getTime() - paid) / 60_000));
  return waitLabel(min < 60 ? Math.max(10, Math.round(min / 10) * 10) : Math.round(min / 30) * 30);
}
