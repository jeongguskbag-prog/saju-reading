// 서버(생성)와 브라우저(표시)가 함께 쓰는 감정서 구조. Anthropic SDK를 import하지 않는다.
import { z } from "zod";

export const PART_KEYS = ["intro", "part1", "part2", "part3", "part4", "part5"] as const;
export type PartKey = (typeof PART_KEYS)[number];
export type ChapterKey = Exclude<PartKey, "intro">;
export const CHAPTER_KEYS: ChapterKey[] = ["part1", "part2", "part3", "part4", "part5"];

export interface ChapterMeta {
  label: string;
  title: string;
  lead: string;
  /** AI가 반드시 이 순서·이 제목으로 소제목을 쓴다. {Y1} {Y2}는 감정 연도로 바뀐다. */
  sections: string[];
}

export const CHAPTERS: Record<ChapterKey, ChapterMeta> = {
  part1: {
    label: "Part 1",
    title: "나의 천명(天命)",
    lead: "타고난 기질과 그릇, 오행의 균형을 살핍니다.",
    sections: ["일간으로 본 타고난 성향", "격국과 용신: 삶의 중심축", "오행 밸런스와 보완 전략"],
  },
  part2: {
    label: "Part 2",
    title: "재물과 커리어",
    lead: "돈이 들어오고 머무는 방식, 일의 적성을 살핍니다.",
    sections: ["현금 흐름 패턴과 재물 그릇", "직장형 vs 사업형 적합도", "리스크 관리와 재물 개운법"],
  },
  part3: {
    label: "Part 3",
    title: "애정 및 인연운",
    lead: "사랑하는 방식과 인연의 결을 살핍니다.",
    sections: ["애정 성향과 배우자궁(일지) 해석", "나를 돕는 귀인의 특징", "관계 개선 솔루션"],
  },
  part4: {
    label: "Part 4",
    title: "10년 대운의 흐름",
    lead: "인생을 열 해 단위로 나눠 큰 흐름과 전환점을 살핍니다.",
    sections: ["대운 흐름 한눈에 보기", "현재 대운의 과제", "인생의 전성기 타이밍과 전환점 가이드"],
  },
  part5: {
    label: "Part 5",
    title: "{Y1}-{Y2} 세운과 개운법",
    lead: "가까운 두 해의 흐름과 생활 속 개운법을 정리합니다.",
    sections: ["{Y1}년 한 해의 흐름", "{Y2}년 한 해의 흐름", "월별 흐름 활용법", "건강 관리 포인트", "행운의 색상·숫자·방위 활용법"],
  },
};

export const withYears = (text: string, years: [number, number]) =>
  text.replace(/\{Y1\}/g, String(years[0])).replace(/\{Y2\}/g, String(years[1]));

export const chapterSchema = z.object({
  sections: z.array(z.object({ heading: z.string().min(1), paragraphs: z.array(z.string().min(1)).min(1) })).min(1),
  actionPlan: z.array(z.string().min(1)),
});
export type Chapter = z.infer<typeof chapterSchema>;

export const introSchema = z.object({
  coverKeywords: z.array(z.string().min(1)).min(1),
  summary: z.string().min(1),
  preface: z.array(z.string().min(1)).min(1),
});
export type Intro = z.infer<typeof introSchema>;

export type PartResult = { part: "intro"; intro: Intro } | { part: ChapterKey; chapter: Chapter };
