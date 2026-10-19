"use client";

import { useState } from "react";

export interface MyReview {
  name: string;
  rating: number;
  text: string;
  createdAt: string;
  hidden: boolean;
}

const LABEL = ["", "아쉬워요", "그저 그래요", "괜찮아요", "좋아요", "아주 좋아요"];

/** 감정서 아래 후기 남기기. 결제한 손님만 이 화면에 오므로 '구매 인증' 후기가 된다. 한 주문에 한 건, 고쳐 쓸 수 있다. */
export default function ReviewForm({ token, initial }: { token: string; initial: MyReview | null }) {
  const [saved, setSaved] = useState<MyReview | null>(initial);
  const [editing, setEditing] = useState(!initial);
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(initial?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bonus, setBonus] = useState(0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rating) return setError("별점을 골라 주세요.");
    if (text.trim().length < 5) return setError("후기를 5자 이상 적어 주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, rating, text }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "후기를 저장하지 못했습니다.");
      setSaved(data.review);
      if (data.bonus) setBonus(data.bonus);
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || rating;
  return (
    <section id="review" className="card review-form no-print">
      <h2>후기 남기기</h2>
      {saved && !editing ? (
        <>
          <p className="review-stars" aria-label={`별점 ${saved.rating}점`}>
            {"★".repeat(saved.rating)}
            <span className="off">{"★".repeat(5 - saved.rating)}</span>
          </p>
          <p className="review-mine">“{saved.text}”</p>
          <p className="muted">
            {saved.name} 님의 후기가 {saved.hidden ? "접수되었습니다." : "첫 화면 '의뢰인 후기'에 실렸습니다."} 소중한 후기 감사합니다.
            {bonus > 0 && ` 감사의 뜻으로 AI 상담 무료 질문 ${bonus}회를 넣어 드렸습니다.`}
          </p>
          <button type="button" className="btn-link" onClick={() => setEditing(true)}>후기 고치기</button>
        </>
      ) : (
        <form onSubmit={onSubmit} className="form-grid">
          <p className="muted">
            감정서는 어떠셨나요? 남겨 주신 후기는 이름 가운데를 가려(예: 박*구) 첫 화면에 실립니다. 회원 보관함의 감정서에 첫 후기를 남기시면 AI 상담 무료 질문 1회를
            드립니다.
          </p>
          <div className="star-pick" role="radiogroup" aria-label="별점" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}점`}
                className={n <= shown ? "on" : undefined}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
              >
                ★
              </button>
            ))}
            <span className="star-label">{LABEL[shown] ?? ""}</span>
          </div>
          <div className="field">
            <label htmlFor="review-text">후기</label>
            <textarea id="review-text" rows={4} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="감정서를 받아 보신 느낌을 자유롭게 적어 주세요. (5~500자)" />
            <p className="muted review-count">{[...text].length}/500</p>
          </div>
          <button className="btn-primary" type="submit" disabled={busy}>{busy ? "저장하는 중…" : saved ? "후기 고쳐 올리기" : "후기 올리기"}</button>
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
