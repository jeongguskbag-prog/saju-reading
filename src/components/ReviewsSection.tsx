import type { Review } from "@/lib/reviews";
import { reviewSummary } from "@/lib/reviews";

const ymd = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
};

/**
 * 첫 화면 '의뢰인 후기'. 실제로 결제한 손님이 감정서 화면에서 남긴 후기만 싣는다(구매 인증).
 * 후기가 하나도 없으면 칸 자체를 보이지 않는다(빈 칸이나 지어낸 후기를 두지 않는다).
 */
export default function ReviewsSection({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) return null;
  const { count, average } = reviewSummary(reviews);
  return (
    <section id="reviews" className="lp-section lp-reviews" aria-labelledby="reviews-h">
      <div className="lp-inner">
        <div className="lp-reviews-head">
          <div>
            <h2 id="reviews-h">의뢰인 후기</h2>
            <p className="lp-lead">
              감정서를 받아 보신 분들이 직접 남긴 후기입니다. <span className="review-avg">★ {average.toFixed(1)}</span> · {count}건
            </p>
          </div>
          <a className="lp-cta-ghost" href="/order?next=review">후기 작성하기</a>
        </div>
        <ul className="review-cards">
          {reviews.map((r) => (
            <li key={r.orderId} className="review-card">
              <div className="review-card-top">
                <span className="review-stars" aria-label={`별점 ${r.rating}점`}>
                  {"★".repeat(r.rating)}
                  <span className="off">{"★".repeat(5 - r.rating)}</span>
                </span>
                <time dateTime={r.createdAt}>{ymd(r.createdAt)}</time>
              </div>
              <p className="review-text">“{r.text}”</p>
              <p className="review-who">
                <b>{r.name}</b> · {r.product.replace(/^천기록 /, "")} <span className="review-badge">구매 인증</span>
              </p>
            </li>
          ))}
        </ul>
        <p className="muted review-note">후기는 결제하신 분만 감정서 화면 아래에서 남길 수 있으며, 이름 가운데를 가려 싣습니다.</p>
      </div>
    </section>
  );
}
