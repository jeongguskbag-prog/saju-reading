// 브랜드와 판매 상품 정보. 가격·문구를 바꿀 때는 여기만 고친다.
export const BRAND = {
  name: "천기록",
  hanja: "天機錄",
  tagline: "100년 종합사주",
};

export const PRODUCT = {
  name: "100년 종합사주 리포트",
  /** 결제 금액(원). 서버가 이 금액으로 주문을 만들고 승인 때 다시 대조한다. */
  price: 19800,
  /**
   * 판매를 열지. true여도 토스 키(TOSS_CLIENT_KEY·TOSS_SECRET_KEY), 저장소(Upstash), AI 키가 모두 있어야 결제창이 열린다.
   * 잠시 판매를 멈추려면 false로 바꾼다.
   */
  checkoutOpen: true,
};

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/**
 * 사업자 정보(전자상거래법상 화면 하단 표시 의무). 빈 값은 화면에 "등록 예정"으로 나온다.
 * 사업자등록·통신판매업 신고 후 채운다.
 */
export const BUSINESS = {
  companyName: "", // 상호
  ceo: "", // 대표자
  bizNumber: "", // 사업자등록번호 000-00-00000
  mailOrderNumber: "", // 통신판매업 신고번호 제0000-지역-0000호
  address: "", // 사업장 주소
  phone: "", // 고객센터 전화
  email: "", // 고객센터 이메일
  privacyOfficer: "", // 개인정보 보호책임자(이름)
};

export const orPending = (v: string) => v || "등록 예정";

/** 약관·방침 시행일 */
export const POLICY_EFFECTIVE_DATE = "2026년 10월 16일";
