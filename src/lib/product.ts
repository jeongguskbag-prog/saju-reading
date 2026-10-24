// 브랜드와 판매 상품 정보. 가격·문구를 바꿀 때는 여기만 고친다.
export const BRAND = {
  name: "천기록",
  hanja: "天機錄",
  tagline: "100년 종합사주",
};

/** 판매를 열지. true여도 토스 키·저장소(Upstash)·AI 키가 모두 있어야 결제창이 열린다. 잠시 판매를 멈추려면 false. */
export const SALES_OPEN = true;

/** 결제 후 감정서 링크를 열 수 있는 기간(일). 메일·안내 문구에도 쓰인다. */
export const REPORT_VALID_DAYS = 30;

import type { ExtraKind } from "./extras/kinds";

/** 사주 감정서(core·full), 작명록(naming), 그리고 추가 상품(궁합·신년 운세·택일·주역 점·자미두수) */
export type CoreProductId = "full" | "core" | "naming";
export type ProductId = CoreProductId | ExtraKind;

export interface Product {
  id: ProductId;
  name: string;
  /** 결제 금액(원). 서버가 이 금액으로 주문을 만들고 승인 때 다시 대조한다. */
  price: number;
  /** 감정서에 담기는 파트. intro는 발간사. */
  parts: ("intro" | "part1" | "part2" | "part3" | "part4" | "part5" | "naming" | ExtraKind)[];
  /** 한 줄 소개. {Y1} {Y2}는 감정 연도. */
  summary: string;
  /** 판매 중인지(false면 "준비 중"으로만 보여 준다) */
  available: boolean;
}

export const PRODUCTS: Record<ProductId, Product> = {
  core: {
    id: "core",
    name: "천기록 핵심 명식록",
    price: 12900,
    parts: ["intro", "part1", "part5"],
    summary: "타고난 본질과 오행 균형, {Y1}~{Y2} 세운과 월별 흐름 집중 분석",
    available: true,
  },
  full: {
    id: "full",
    name: "천기록 종합 감정서",
    price: 19900,
    parts: ["intro", "part1", "part2", "part3", "part4", "part5"],
    summary: "평생 대운의 흐름, 타고난 재물 그릇, 커리어·사업운, 인연운, 맞춤 개운법",
    available: true,
  },
  naming: {
    id: "naming",
    name: "길운 개운 작명록",
    price: 29000,
    parts: ["naming"],
    summary: "사주의 부족한 오행을 보완하는 수리·자원오행 맞춤 작명·개명 추천",
    available: true,
  },
  gunghap: {
    id: "gunghap",
    name: "천기록 연분록(궁합)",
    price: 16900,
    parts: ["gunghap"],
    summary: "두 사람의 명식으로 보는 일간·배우자 자리·오행 보완·대운 동행 궁합 감정서",
    available: true,
  },
  newyear: {
    id: "newyear",
    name: "천기록 신년 운세록",
    price: 9900,
    parts: ["newyear"],
    summary: "한 해의 간지가 내 명식·대운에 들어오는 모습과 삼재, 열두 달 월운과 달마다 할 일",
    available: true,
  },
  taekil: {
    id: "taekil",
    name: "천기록 택일록",
    price: 16900,
    parts: ["taekil"],
    summary: "결혼·이사·개업·계약 등 큰일에 맞는 길일을 내 사주와 날의 간지로 골라 드립니다",
    available: true,
  },
  iching: {
    id: "iching",
    name: "천기록 주역 점",
    price: 3900,
    parts: ["iching"],
    summary: "한 가지 물음에 대해 시초점 방식으로 괘를 얻고 본괘·변효·지괘로 풀어 드립니다",
    available: true,
  },
  ziwei: {
    id: "ziwei",
    name: "천기록 자미두수 명반",
    price: 16900,
    parts: ["ziwei"],
    summary: "열두 궁에 별을 배치한 자미두수 명반으로 보는 타고난 성향과 10년 대한",
    available: true,
  },
};

/** 화면에 보여 줄 순서(사주 감정서 줄) */
export const PRODUCT_ORDER: CoreProductId[] = ["core", "full", "naming"];
/** 추가 상품 줄 */
export const EXTRA_ORDER: ExtraKind[] = ["gunghap", "newyear", "taekil", "iching", "ziwei"];
export const DEFAULT_PRODUCT: ProductId = "full";
export const sellableProducts = () => [...PRODUCT_ORDER, ...EXTRA_ORDER].map((id) => PRODUCTS[id]).filter((p) => p.available);
/** 사주 감정서 줄만(앱·외국어 화면처럼 추가 상품을 아직 열지 않은 곳) */
export const sellableCoreProducts = () => PRODUCT_ORDER.map((id) => PRODUCTS[id]).filter((p) => p.available);

export const withProductYears = (text: string, years: [number, number]) =>
  text.replace(/\{Y1\}/g, String(years[0])).replace(/\{Y2\}/g, String(years[1]));

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
  email: "help@chungirok.com", // 고객센터 이메일(기타 문의). ImprovMX로 운영자 Gmail에 전달된다.
  privacyOfficer: "", // 개인정보 보호책임자(이름)
};

export const orPending = (v: string) => v || "등록 예정";

/**
 * 카카오톡 채널 1:1 상담. 카카오톡 채널 관리자센터에서 채널을 만들고 '1:1 채팅'을 켠 뒤,
 * 채널 주소(예: https://pf.kakao.com/_AbCdE)를 여기 넣거나 Vercel 환경변수 NEXT_PUBLIC_KAKAO_CHANNEL_URL에 넣는다.
 * 비어 있으면 카톡 상담 버튼은 숨기고 이메일만 보여 준다.
 */
export const SUPPORT = {
  kakaoChannelUrl: "https://pf.kakao.com/_axalmX", // 천기록 채널(검색용 아이디 @천기록)
};

/** 카톡 1:1 채팅으로 바로 열리는 주소. 채널 주소 뒤에 /chat을 붙인다. */
export function kakaoChatUrl(): string | null {
  // Vercel 환경변수 NEXT_PUBLIC_KAKAO_CHANNEL_URL이 있으면 그 값을 쓴다(코드 수정 없이 설정 가능, 바꾸면 다시 배포).
  const fromEnv = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL : undefined;
  const u = (fromEnv || SUPPORT.kakaoChannelUrl).trim().replace(/\/+$/, "");
  if (!u) return null;
  return u.endsWith("/chat") ? u : `${u}/chat`;
}

/** 카카오톡 채널 친구 추가 주소(채널 주소 뒤에 /friend) */
export function kakaoFriendUrl(): string | null {
  const chat = kakaoChatUrl();
  return chat ? chat.replace(/\/chat$/, "/friend") : null;
}

/** 약관·방침 시행일 */
export const POLICY_EFFECTIVE_DATE = "2026년 10월 24일";
