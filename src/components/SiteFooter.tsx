import { BRAND, BUSINESS, orPending } from "@/lib/product";
import BrandSeal from "./BrandSeal";

/** 모든 화면 하단: 사업자 정보와 약관·방침 링크. 인쇄(PDF)에는 넣지 않는다. */
export default function SiteFooter() {
  const b = BUSINESS;
  return (
    <footer className="site-footer no-print">
      <div className="site-footer-inner">
        <p className="site-footer-brand">
          <BrandSeal size={28} title="" />
          {BRAND.name}
        </p>
        <nav className="site-footer-links" aria-label="약관 및 방침">
          <a href="/terms">이용약관</a>
          <a href="/privacy">
            <b>개인정보처리방침</b>
          </a>
          <a href="/refund">환불 규정</a>
        </nav>
        <dl className="site-footer-biz">
          <div><dt>상호</dt><dd>{orPending(b.companyName)}</dd></div>
          <div><dt>대표</dt><dd>{orPending(b.ceo)}</dd></div>
          <div><dt>사업자등록번호</dt><dd>{orPending(b.bizNumber)}</dd></div>
          <div><dt>통신판매업 신고</dt><dd>{orPending(b.mailOrderNumber)}</dd></div>
          <div><dt>주소</dt><dd>{orPending(b.address)}</dd></div>
          <div><dt>고객센터</dt><dd>{[b.phone, b.email].filter(Boolean).join(" / ") || "등록 예정"}</dd></div>
        </dl>
        <p className="site-footer-note">
          명식은 만세력 계산 엔진이, 풀이 문장은 AI(Claude)가 작성합니다. 명리학 이론에 기반한 참고 자료이며 미래를 보장하지 않습니다.
          결제는 토스페이먼츠가 처리하며 카드 정보는 {BRAND.name}에 저장되지 않습니다.
        </p>
      </div>
    </footer>
  );
}
