import type { MetadataRoute } from "next";
import { CANONICAL_ORIGIN } from "@/lib/canonical";

/** 검색 엔진에 알릴 공개 페이지 목록 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly") => ({
    url: `${CANONICAL_ORIGIN}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page("/", 1, "weekly"),
    page("/today", 0.8, "daily"),
    page("/guide", 0.7, "monthly"),
    page("/gift", 0.6, "monthly"),
    page("/zh-tw", 0.5, "weekly"),
    page("/zh-hk", 0.5, "weekly"),
    page("/en", 0.5, "weekly"),
    page("/terms", 0.2, "monthly"),
    page("/privacy", 0.2, "monthly"),
    page("/refund", 0.2, "monthly"),
  ];
}
