// 검색 엔진에 알려 줄 대표 주소(https://www.chungirok.com). SITE_URL이 있으면 그것을 쓴다.
export const CANONICAL_ORIGIN = (process.env.SITE_URL || "https://www.chungirok.com").replace(/\/$/, "");
