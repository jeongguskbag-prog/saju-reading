import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/product";
import "./globals.css";
import FontLinks from "@/components/FontLinks";
import { headers } from "next/headers";
import { SITES, type SiteLocale } from "@/lib/site-copy";

import { CANONICAL_ORIGIN } from "@/lib/canonical";

// 공유 미리보기 이미지와 대표 주소(canonical)의 기준 주소. 검색엔진에 한 주소(www)만 알리도록 고정한다.
const siteUrl = CANONICAL_ORIGIN;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${BRAND.name} — 무료 사주 풀이·100년 종합 사주 감정서`,
  description:
    "생년월일시만 넣으면 절기를 분 단위로 맞춘 만세력으로 사주팔자를 세워 내 사주 유형과 오행·대운을 무료로 보여 드립니다. 궁합, 2027 신년 운세, 택일, 자미두수, 작명까지 명리 계산값을 근거로 쓴 1:1 감정서.",
  keywords: ["사주", "무료 사주", "사주 풀이", "만세력", "궁합", "신년 운세", "2027 운세", "택일", "자미두수", "작명", "오늘의 운세", "대운"],
  openGraph: { siteName: BRAND.name, locale: "ko_KR", type: "website" },
  // 네이버 서치어드바이저·구글 서치콘솔 소유 확인(Vercel 설정값으로 넣는다)
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.NAVER_SITE_VERIFICATION ? { other: { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION } } : {}),
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#24324f",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 대만(/zh-tw)·홍콩(/zh-hk) 주소는 proxy.ts가 사이트 언어를 알려 준다. 그 밖에는 한국어.
  const requested = (await headers()).get("x-site-locale") as SiteLocale | null;
  const lang = SITES[requested && requested in SITES ? requested : "ko"].htmlLang;
  return (
    <html lang={lang}>
      <head>
        <FontLinks />
      </head>
      <body>
        {/* 인쇄(PDF) 때는 이 상자 밖의 요소(휴대폰 앱·확장 프로그램이 끼워 넣은 버튼 등)를 모두 숨긴다. */}
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
