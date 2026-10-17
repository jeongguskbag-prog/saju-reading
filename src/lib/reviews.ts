// 의뢰인 후기(서버 전용). 결제한 손님만 자기 감정서 화면에서 한 건씩 남길 수 있다(고쳐 쓰기 가능).
// 첫 화면에는 숨기지 않은 후기를 최신 순으로 보여 준다. 이름은 가운데를 가리고, 관리 화면에서 숨길 수 있다.
// 지어낸 후기를 넣는 기능은 두지 않는다: 후기는 실제 주문(토큰)으로만 만들어진다.
import { getReport, getSavedParts } from "./orders";
import { requireStore, getStore } from "./store";

export interface Review {
  orderId: string;
  /** 가운데를 가린 이름(박*구) */
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string;
  /** 상품 이름(천기록 종합 감정서) */
  product: string;
  createdAt: string;
  updatedAt?: string;
  /** 관리자가 숨긴 후기 */
  hidden?: boolean;
}

export class ReviewError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const reviewKey = (orderId: string) => `review:${orderId}`;
export const REVIEW_INDEX = "reviews:all";
export const REVIEW_MIN = 5;
export const REVIEW_MAX = 500;

/** 이름 가운데를 가린다: 박정구 → 박*구, 김민 → 김*, 남궁민수 → 남**수 */
export function maskName(raw: string | undefined): string {
  const name = (raw ?? "").replace(/\s+/g, "").replace(/○/g, "");
  const chars = [...name];
  if (chars.length === 0) return "의뢰인";
  if (chars.length === 1) return `${chars[0]}*`;
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}${"*".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

/** 글을 다듬는다: 앞뒤 공백, 제어 문자, 지나친 줄바꿈을 걷어 낸다. */
export function cleanReviewText(raw: string): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function getReviewByOrder(orderId: string): Promise<Review | null> {
  return requireStore().get<Review>(reviewKey(orderId));
}

/** 감정서 토큰으로 후기를 쓰거나 고친다. 감정서가 다 쓰인 결제 주문만. */
export async function submitReview(token: string, ratingRaw: unknown, textRaw: unknown, now = new Date()): Promise<Review> {
  const report = await getReport(token, now);
  if (!report) throw new ReviewError("감정서를 찾을 수 없습니다.", 404);
  if (report.expired) throw new ReviewError("열람 기간이 지난 감정서에는 후기를 남길 수 없습니다.", 410);
  const saved = await getSavedParts(token, report.product.parts);
  if (report.product.parts.some((p) => !saved[p])) throw new ReviewError("감정서가 완성된 뒤에 후기를 남겨 주세요.", 409);
  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ReviewError("별점을 골라 주세요.");
  const text = cleanReviewText(String(textRaw ?? ""));
  if ([...text].length < REVIEW_MIN) throw new ReviewError(`후기를 ${REVIEW_MIN}자 이상 적어 주세요.`);
  if ([...text].length > REVIEW_MAX) throw new ReviewError(`후기는 ${REVIEW_MAX}자까지 적을 수 있습니다.`);
  const store = requireStore();
  const before = await store.get<Review>(reviewKey(report.order.id));
  const review: Review = {
    orderId: report.order.id,
    name: maskName(report.order.input.name),
    rating: rating as Review["rating"],
    text,
    product: report.product.name,
    createdAt: before?.createdAt ?? now.toISOString(),
    ...(before ? { updatedAt: now.toISOString() } : {}),
    ...(before?.hidden ? { hidden: true } : {}),
  };
  await store.set(reviewKey(review.orderId), review);
  if (!before) await store.listPush(REVIEW_INDEX, review.orderId);
  return review;
}

/** 최신 후기들. 기본은 숨긴 것을 뺀다. 저장소가 없으면 빈 목록. */
export async function listReviews({ limit = 12, includeHidden = false } = {}): Promise<Review[]> {
  const store = getStore();
  if (!store) return [];
  try {
    const ids = await store.listRange(REVIEW_INDEX, 0, Math.max(limit * 3, 60) - 1);
    const all = await Promise.all(ids.map((id) => store.get<Review>(reviewKey(id))));
    return all.filter((r): r is Review => Boolean(r) && (includeHidden || !r!.hidden)).slice(0, limit);
  } catch (error) {
    console.error("후기 목록을 읽지 못했습니다", error);
    return [];
  }
}

/** 관리자가 후기를 숨기거나 다시 보인다. */
export async function setReviewHidden(orderId: string, hidden: boolean): Promise<boolean> {
  const store = requireStore();
  const review = await store.get<Review>(reviewKey(orderId));
  if (!review) return false;
  const { hidden: _h, ...rest } = review;
  void _h;
  await store.set(reviewKey(orderId), hidden ? { ...rest, hidden: true } : rest);
  return true;
}

/** 별점 평균과 건수(숨긴 것 제외) */
export function reviewSummary(reviews: Review[]): { count: number; average: number } {
  if (!reviews.length) return { count: 0, average: 0 };
  return { count: reviews.length, average: Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 };
}
