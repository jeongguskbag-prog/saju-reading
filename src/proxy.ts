import { NextResponse, type NextRequest } from "next/server";
import { localeFromPath } from "@/lib/i18n/locales";

/** 대만·홍콩 주소로 들어오면 화면 언어를 요청 머리글(x-site-locale)에 적어, 최상위 레이아웃이 <html lang>을 맞추게 한다. */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-site-locale", localeFromPath(request.nextUrl.pathname));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/zh-tw", "/zh-tw/:path*", "/zh-hk", "/zh-hk/:path*"],
};
