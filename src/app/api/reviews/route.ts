import { clientIp } from "@/lib/rate-limit";
import { ReviewError, submitReview } from "@/lib/reviews";
import { getStore } from "@/lib/store";

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
    return Response.json({ review: { name: review.name, rating: review.rating, text: review.text, createdAt: review.createdAt, hidden: Boolean(review.hidden) } });
  } catch (error) {
    if (error instanceof ReviewError) return Response.json({ error: error.message }, { status: error.status });
    console.error(error);
    return Response.json({ error: "후기를 저장하지 못했습니다." }, { status: 500 });
  }
}
