import type { Metadata, Viewport } from "next";
import { BRAND } from "@/lib/product";
import "./globals.css";

export const metadata: Metadata = {
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: "절기를 분 단위로 맞춘 만세력으로 사주를 세우고, 다섯 등급 가운데 내 사주의 자리와 100년의 대운 흐름을 알려 드립니다.",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Song+Myung&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
