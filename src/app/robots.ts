import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/canonical";

/** 검색 로봇 안내: 손님 개인 화면(감정서·선물·마이·관리·결제)은 모으지 않게 한다. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/r/", "/gift/", "/my", "/app", "/pay/", "/order", "/consult"] }],
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: CANONICAL_ORIGIN,
  };
}
