// 브랜드와 판매 상품 정보. 가격·문구를 바꿀 때는 여기만 고친다.
export const BRAND = {
  name: "천기록",
  hanja: "天機錄",
  tagline: "100년 종합사주",
};

export const PRODUCT = {
  name: "100년 종합사주 리포트",
  /** 원. 결제 연동 전까지는 안내용으로만 표시한다. */
  price: 19800,
  /** 결제 기능이 열렸는지. false면 결제 버튼 대신 준비 중 안내를 보여 준다. */
  checkoutOpen: false,
};

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
