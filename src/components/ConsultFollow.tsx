import { REPORT_BONUS_QUESTIONS } from "@/lib/consult-copy";

/** 감정서 끝: 같은 명식으로 AI 상담에서 이어 묻기 */
export default function ConsultFollow({ kept }: { kept: boolean }) {
  return (
    <section className="card consult-follow no-print" aria-labelledby="consult-follow-h">
      <h2 id="consult-follow-h">이 감정서로 궁금한 점, 이어서 물어보세요</h2>
      <p>
        AI 사주 상담은 이 감정서와 같은 명식 계산값(원국·대운·세운·월별 흐름)을 근거로 답합니다. “올해 이직해도 될까요?”, “계약은 언제가 좋을까요?”처럼
        감정서를 읽고 생긴 궁금증을 바로 물어보세요.
      </p>
      <p className="muted">
        {kept
          ? `이 감정서는 회원 보관함에 있습니다. 감정서를 보관함에 넣은 분께 무료 질문 ${REPORT_BONUS_QUESTIONS}회를 드리며, 감정서의 사주도 '마이'에 저장해 두었습니다.`
          : `카카오로 로그인한 뒤 '마이'에서 주문번호로 이 감정서를 보관함에 넣으면 무료 질문 ${REPORT_BONUS_QUESTIONS}회를 드리고, 감정서도 기간 없이 보관됩니다.`}
      </p>
      <div className="consult-follow-actions">
        <a className="btn-primary link-btn" href="/consult">
          AI 상담으로 이어 묻기
        </a>
        {!kept && (
          <a className="btn-secondary link-btn" href="/my">
            마이에 감정서 넣기
          </a>
        )}
      </div>
    </section>
  );
}
