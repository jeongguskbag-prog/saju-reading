import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/product";
import "./globals.css";
import FontLinks from "@/components/FontLinks";

// 공유 미리보기 이미지(opengraph-image.png)의 절대 주소를 만들 기준 주소.
const siteUrl =
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: "절기를 분 단위로 맞춘 만세력으로 사주를 세우고, 다섯 등급 가운데 내 사주의 자리와 100년의 대운 흐름을 알려 드립니다.",
  openGraph: { siteName: BRAND.name, locale: "ko_KR", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#24324f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
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
