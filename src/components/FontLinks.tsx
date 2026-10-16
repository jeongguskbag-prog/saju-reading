"use client";

import { usePathname } from "next/navigation";

/**
 * 제목용 웹 글꼴(Song Myung). 중국 대륙 앱 화면(/app/zh-hans)에서는 불러오지 않는다.
 * 중국 대륙에서는 Google Fonts가 막혀 있어, 이 스타일시트를 기다리느라 화면이 늦게 뜰 수 있다.
 */
export default function FontLinks() {
  const pathname = usePathname();
  if (pathname?.startsWith("/app/zh-hans")) return null;
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      {/* Noto Serif KR: 감정서 풀이 문장 속 한자(.hz)를 기기와 상관없이 같은 글꼴로 찍는다. */}
      <link href="https://fonts.googleapis.com/css2?family=Song+Myung&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet" />
    </>
  );
}
