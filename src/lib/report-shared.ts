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

/** 대만·홍콩 앱(번체)의 감정서 구조. 소제목 순서는 한국어판과 같다. */
export const CHAPTERS_ZH: Record<ChapterKey, ChapterMeta> = {
  part1: {
    label: "Part 1",
    title: "我的天命",
    lead: "解讀與生俱來的性格、格局與五行平衡。",
    sections: ["從日主看天生性格", "格局與用神：人生的核心軸", "五行平衡與補強策略"],
  },
  part2: {
    label: "Part 2",
    title: "財富與事業",
    lead: "解讀財富進出與留存的方式，以及適合的工作型態。",
    sections: ["現金流模式與財富格局", "上班族 vs 創業型適合度", "風險管理與招財開運法"],
  },
  part3: {
    label: "Part 3",
    title: "感情與姻緣",
    lead: "解讀你愛人的方式與緣分的特質。",
    sections: ["感情傾向與配偶宮（日支）解讀", "助我貴人的特徵", "改善關係的具體方法"],
  },
  part4: {
    label: "Part 4",
    title: "十年大運走勢",
    lead: "以十年為單位，解讀人生的大方向與轉捩點。",
    sections: ["大運走勢一覽", "目前大運的課題", "人生巔峰時機與轉捩點指南"],
  },
  part5: {
    label: "Part 5",
    title: "{Y1}-{Y2} 流年與開運法",
    lead: "整理未來兩年的運勢走向與生活中的開運方法。",
    sections: ["{Y1} 年整體運勢", "{Y2} 年整體運勢", "流月運用指南", "健康管理重點", "幸運色・數字・方位運用法"],
  },
};

/** 중국 대륙 앱(간체)의 감정서 구조. 소제목 순서는 한국어판과 같다. */
export const CHAPTERS_HANS: Record<ChapterKey, ChapterMeta> = {
  part1: {
    label: "Part 1",
    title: "我的天命",
    lead: "解读与生俱来的性格、格局与五行平衡。",
    sections: ["从日主看天生性格", "格局与用神：人生的核心轴", "五行平衡与补强策略"],
  },
  part2: {
    label: "Part 2",
    title: "财富与事业",
    lead: "解读财富进出与留存的方式，以及适合的工作型态。",
    sections: ["现金流模式与财富格局", "上班族 vs 创业型适合度", "风险管理与招财开运法"],
  },
  part3: {
    label: "Part 3",
    title: "感情与姻缘",
    lead: "解读你爱人的方式与缘分的特质。",
    sections: ["感情倾向与配偶宫（日支）解读", "助我贵人的特征", "改善关系的具体方法"],
  },
  part4: {
    label: "Part 4",
    title: "十年大运走势",
    lead: "以十年为单位，解读人生的大方向与转折点。",
    sections: ["大运走势一览", "目前大运的课题", "人生巅峰时机与转折点指南"],
  },
  part5: {
    label: "Part 5",
    title: "{Y1}-{Y2} 流年与开运法",
    lead: "整理未来两年的运势走向与生活中的开运方法。",
    sections: ["{Y1} 年整体运势", "{Y2} 年整体运势", "流月运用指南", "健康管理重点", "幸运色・数字・方位运用法"],
  },
};

export const chaptersFor = (locale: "ko" | "zh-Hant" | "zh-Hans" = "ko") =>
  locale === "zh-Hant" ? CHAPTERS_ZH : locale === "zh-Hans" ? CHAPTERS_HANS : CHAPTERS;

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
