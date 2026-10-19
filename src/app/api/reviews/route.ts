import { clientIp } from "@/lib/rate-limit";
import { ReviewError, submitReview } from "@/lib/reviews";
import { getStore } from "@/lib/store";
import { getOrder } from "@/lib/orders";
import { grantReviewBonus } from "@/lib/member";

export const dynamic = "force-dynamic";

/** 후기 쓰기·고치기: { token, rating, text }. 같은 기기에서 1시간에 20번까지. */
export async function POST(request: Request) {
  const store = getStore();
  const hour = new Date().toISOString().slice(0, 13);
  if (store && (await store.incr(`review-rate:${clientIp(request.headers)}:${hour}`, 3600)) > 20) {
    return Response.json({ error: "잠시 뒤 다시 시도해 주세요." }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { token?: unknown; rating?: unknown; text?: unknown } | null;
  try {
    const review = await submitReview(String(body?.token ?? ""), body?.rating, body?.text);
    // 회원 보관함의 감정서면 첫 후기에 AI 상담 무료 질문을 드린다.
    const order = await getOrder(review.orderId);
    const bonus = order ? await grantReviewBonus(order).catch(() => 0) : 0;
    return Response.json({ review: { name: review.name, rating: review.rating, text: review.text, createdAt: review.createdAt, hidden: Boolean(review.hidden) }, bonus });
  } catch (error) {
    if (error instanceof ReviewError) return Response.json({ error: error.message }, { status: error.status });
    console.error(error);
    return Response.json({ error: "후기를 저장하지 못했습니다." }, { status: 500 });
  }
}
