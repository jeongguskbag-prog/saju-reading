// 오늘의 행운 색: 오늘 일진(日辰)에 내 용신·희신이 빠져 있으면 그 기운을 색으로 채우고, 기신이 강한 날은 용신 색으로 균형을 잡는다.
// 계산만 쓰고 AI는 쓰지 않는다(브라우저에서도 돈다). 날마다 일진이 바뀌므로 색과 이유도 날마다 달라진다.
import type { SajuChart } from "./calc";
import { BRANCHES, BRANCH_ELEMENT, BRANCH_KO, ELEMENT_KO, STEMS, STEM_ELEMENT, STEM_KO, type Branch, type Element, type Stem } from "./constants";

/** 양력 날짜의 일진. 일진은 60갑자가 하루씩 차례로 돌므로 2000-01-01(戊午, 갑자 순번 54)부터 날 수로 센다(만세력 라이브러리를 브라우저에 싣지 않으려고). */
export function dayGanzhi(y: number, m: number, d: number): [Stem, Branch] {
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86_400_000);
  const i = (((54 + days) % 60) + 60) % 60;
  return [STEMS[i % 10], BRANCHES[i % 12]];
}

/** 오행별 색: 화면에 칠할 대표색(hex)과 이름, 옷·소품 제안 */
export const ELEMENT_COLORS: Record<Element, { swatches: { name: string; hex: string }[]; tip: string }> = {
  wood: {
    swatches: [
      { name: "초록", hex: "#3f8f5a" },
      { name: "청록", hex: "#2a8c8c" },
    ],
    tip: "초록 계열 셔츠나 니트, 식물 무늬 소품",
  },
  fire: {
    swatches: [
      { name: "빨강", hex: "#c8323a" },
      { name: "주황", hex: "#e07a2f" },
      { name: "보라", hex: "#7b4fa0" },
    ],
    tip: "포인트로 붉은 립·스카프·양말 하나",
  },
  earth: {
    swatches: [
      { name: "노랑", hex: "#e2b33a" },
      { name: "베이지", hex: "#d8c3a0" },
      { name: "황토", hex: "#b8863b" },
    ],
    tip: "베이지 코트·카멜 가방처럼 따뜻한 흙빛",
  },
  metal: {
    swatches: [
      { name: "흰색", hex: "#f4f2ec" },
      { name: "은색", hex: "#b9bcc2" },
      { name: "금색", hex: "#c9a646" },
    ],
    tip: "흰 셔츠, 은·금 액세서리나 시계",
  },
  water: {
    swatches: [
      { name: "검정", hex: "#22252b" },
      { name: "남색", hex: "#1f3a6b" },
    ],
    tip: "검정·남색 겉옷이나 데님",
  },
};

export interface LuckyColor {
  /** YYYY-MM-DD(한국 날짜) */
  date: string;
  ganzhi: string;
  reading: string;
  element: Element;
  elementKo: string;
  swatches: { name: string; hex: string }[];
  tip: string;
  /** 왜 이 색인지(계산 근거) */
  reason: string;
  /** 오늘은 줄이면 좋은 색(기신) */
  avoid: { elementKo: string; names: string };
}

export function luckyColor(chart: SajuChart, now = new Date()): LuckyColor {
  const k = new Date(now.getTime() + 9 * 3_600_000);
  const [y, m, d] = [k.getUTCFullYear(), k.getUTCMonth() + 1, k.getUTCDate()];
  const [stem, branch] = dayGanzhi(y, m, d);
  const gz = stem + branch;
  const dayEls: Element[] = [STEM_ELEMENT[stem], BRANCH_ELEMENT[branch]];
  const u = chart.analysis.usefulness;
  const ko = (e: Element) => ELEMENT_KO[e];
  const day = `오늘 일진 ${gz}(${STEM_KO[stem as Stem]}${BRANCH_KO[branch]})은 ${ko(dayEls[0])}·${ko(dayEls[1])}의 기운`;

  let element: Element;
  let reason: string;
  const gisinCount = dayEls.filter((e) => e === u.gisin).length;
  if (gisinCount >= 1) {
    element = u.yongsin;
    reason = `${day}이라 내 사주가 꺼리는 ${ko(u.gisin)} 기운이 들어옵니다. 내 사주에 필요한 ${ko(u.yongsin)}의 색으로 균형을 잡아 보세요.`;
  } else if (!dayEls.includes(u.yongsin)) {
    element = u.yongsin;
    reason = `${day}입니다. 내 사주에 필요한 ${ko(u.yongsin)} 기운이 오늘은 비어 있어 색으로 채우면 좋습니다.`;
  } else if (!dayEls.includes(u.huisin)) {
    element = u.huisin;
    reason = `${day}으로 내 사주에 필요한 ${ko(u.yongsin)} 기운이 이미 들어온 날입니다. 그 기운을 북돋는 ${ko(u.huisin)}의 색을 더해 보세요.`;
  } else {
    element = u.yongsin;
    reason = `${day}으로 내 사주에 맞는 기운이 고루 들어온 날입니다. ${ko(u.yongsin)}의 색으로 흐름을 이어 가세요.`;
  }
  const c = ELEMENT_COLORS[element];
  return {
    date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    ganzhi: gz,
    reading: STEM_KO[stem as Stem] + BRANCH_KO[branch],
    element,
    elementKo: ko(element),
    swatches: c.swatches,
    tip: c.tip,
    reason,
    avoid: { elementKo: ko(u.gisin), names: ELEMENT_COLORS[u.gisin].swatches.map((s) => s.name).join("·") },
  };
}
