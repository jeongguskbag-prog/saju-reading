import { NextResponse, type NextRequest } from "next/server";
import { isSiteLocale, SITE_LANG_COOKIE, SITES, siteFromAcceptLanguage, siteFromPath } from "@/lib/site-copy";

const YEAR = 60 * 60 * 24 * 365;

/**
 * 1) 언어 선택 링크(?lang=…)를 누르면 그 언어를 쿠키에 기억하고 깨끗한 주소로 보낸다.
 * 2) 첫 화면(/)에 처음 온 손님은 브라우저·기기 언어를 보고 대만·홍콩 화면으로 보낸다(고른 언어가 있으면 그것을 따른다).
 * 3) 대만·홍콩 주소는 화면 언어를 요청 머리글(x-site-locale)에 적어, 최상위 레이아웃이 <html lang>을 맞추게 한다.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const lang = url.searchParams.get("lang");
  if (isSiteLocale(lang)) {
    const clean = url.clone();
    clean.searchParams.delete("lang");
    const res = NextResponse.redirect(clean, 307);
    res.cookies.set(SITE_LANG_COOKIE, lang, { path: "/", maxAge: YEAR, sameSite: "lax" });
    return res;
  }
  if (url.pathname === "/") {
    const saved = request.cookies.get(SITE_LANG_COOKIE)?.value;
    const want = isSiteLocale(saved) ? saved : siteFromAcceptLanguage(request.headers.get("accept-language"));
    if (want && want !== "ko") {
      const to = url.clone();
      to.pathname = SITES[want].path;
      const res = NextResponse.redirect(to, 307);
      res.headers.set("Vary", "Accept-Language, Cookie");
      res.headers.set("Cache-Control", "private, no-store");
      return res;
    }
    const res = NextResponse.next();
    res.headers.set("Vary", "Accept-Language, Cookie");
    return res;
  }
  const headers = new Headers(request.headers);
  headers.set("x-site-locale", siteFromPath(url.pathname));
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/", "/zh-tw", "/zh-tw/:path*", "/zh-hk", "/zh-hk/:path*"],
};
