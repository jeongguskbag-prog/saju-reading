// 서버(생성)와 브라우저(표시)가 함께 쓰는 풀이 형식. Anthropic SDK를 import하지 않는다.
import { z } from "zod";

export const SECTION_KEYS = ["personality", "wealth", "love", "health", "thisYear"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_TITLES: Record<SectionKey, string> = {
  personality: "성격과 기질",
  wealth: "재물운",
  love: "연애·결혼운",
  health: "건강",
  thisYear: "올해 운세",
};

const sectionSchema = z.object({
  body: z.string().min(1),
  tips: z.array(z.string()),
});

export const readingSchema = z.object({
  summary: z.string().min(1),
  personality: sectionSchema,
  wealth: sectionSchema,
  love: sectionSchema,
  health: sectionSchema,
  thisYear: sectionSchema,
});

export type Reading = z.infer<typeof readingSchema>;
