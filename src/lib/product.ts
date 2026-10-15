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
