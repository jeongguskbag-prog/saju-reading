import { NextResponse, type NextRequest } from "next/server";
import { CANONICAL_ORIGIN } from "@/lib/canonical";
import { isSiteLocale, SITE_LANG_COOKIE, SITES, siteFromAcceptLanguage, siteFromPath } from "@/lib/site-copy";

const YEAR = 60 * 60 * 24 * 365;

/**
 * 예전 주소(*.vercel.app)로 들어온 화면 요청을 대표 주소(www.chungirok.com)로 넘길지.
 * - 실제 사이트(VERCEL_ENV=production)에서만. 미리보기 배포 주소는 그대로 둔다.
 * - /api/… 는 넘기지 않는다: 예전 주소로 이미 예약된 발송(QStash), 결제·카카오 로그인처럼 진행 중인 요청이 끊기지 않게.
 */
export function canonicalRedirect(host: string, pathname: string, search: string, env = process.env.VERCEL_ENV): string | null {
  const h = host.toLowerCase().split(":")[0];
  const target = new URL(CANONICAL_ORIGIN);
  if (env !== "production" || !h.endsWith(".vercel.app") || h === target.hostname || pathname.startsWith("/api/")) return null;
  return `${target.origin}${pathname}${search}`;
}

/**
 * 0) 예전 주소(*.vercel.app)의 화면 요청은 대표 주소로 영구 이동(308)한다.
 * 1) 언어 선택 링크(?lang=…)를 누르면 그 언어를 쿠키에 기억하고 깨끗한 주소로 보낸다.
 * 2) 첫 화면(/)에 처음 온 손님은 브라우저·기기 언어를 보고 대만·홍콩·영어 화면으로 보낸다(고른 언어가 있으면 그것을 따른다).
 * 3) 대만·홍콩·영어 주소는 화면 언어를 요청 머리글(x-site-locale)에 적어, 최상위 레이아웃이 <html lang>을 맞추게 한다.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const moved = canonicalRedirect(request.headers.get("host") ?? url.host, url.pathname, url.search);
  if (moved) return NextResponse.redirect(moved, 308);
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
  // 화면 주소 전체(예전 주소 넘기기 때문). api·빌드 파일·정적 파일은 제외한다.
  matcher: ["/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|pdf|css|js|woff2?|txt|xml)$).*)"],
};
