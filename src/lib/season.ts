// 신년 운세 시즌(11월 15일~2월 말, 한국 시간). 첫 화면 배너와 신년 운세록 추천에 쓴다.
// NEWYEAR_SEASON=on 이면 늘 켜고, off 이면 늘 끈다(미리 보기·조기 종료용).
import { BRANCH_ANIMAL, BRANCH_KO, STEM_ELEMENT, STEM_KO, type Element } from "./saju/constants";
import { yearGanZhi } from "./saju/gods";

const COLOR: Record<Element, string> = { wood: "푸른", fire: "붉은", earth: "누런", metal: "흰", water: "검은" };

export interface NewyearSeason {
  year: number;
  /** 丁未 */
  ganzhi: string;
  /** 정미 */
  reading: string;
  /** 양 */
  animal: string;
  /** 붉은 */
  color: string;
}

/** 지금이 신년 시즌이면 그 해(11~12월은 다음 해, 1~2월은 올해)의 정보를, 아니면 null */
export function newyearSeason(now = new Date(), mode = process.env.NEWYEAR_SEASON): NewyearSeason | null {
  const k = new Date(now.getTime() + 9 * 3_600_000);
  const m = k.getUTCMonth() + 1;
  const d = k.getUTCDate();
  const inSeason = (m === 11 && d >= 15) || m === 12 || m <= 2;
  if (mode === "off" || (!inSeason && mode !== "on")) return null;
  const year = m >= 10 ? k.getUTCFullYear() + 1 : k.getUTCFullYear();
  const [stem, branch] = yearGanZhi(year);
  return { year, ganzhi: stem + branch, reading: STEM_KO[stem] + BRANCH_KO[branch], animal: BRANCH_ANIMAL[branch], color: COLOR[STEM_ELEMENT[stem]] };
}
