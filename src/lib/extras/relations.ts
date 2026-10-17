// 간지끼리의 관계(합·충·형·파·해·원진). 궁합·택일에서 쓴다.
import type { Branch, Stem } from "../saju/constants";

const pairKey = (a: string, b: string) => [a, b].sort().join("");
const pairs = (list: string[]) => new Set(list.map((p) => pairKey(p[0], p[1])));

/** 천간합과 합화 오행 */
export const STEM_COMBINE: Record<string, string> = { 甲己: "토", 乙庚: "금", 丙辛: "수", 丁壬: "목", 戊癸: "화" };
const STEM_COMBINE_KEYS = new Map(Object.entries(STEM_COMBINE).map(([k, v]) => [pairKey(k[0], k[1]), v]));
/** 천간충(칠충) */
const STEM_CLASH = pairs(["甲庚", "乙辛", "丙壬", "丁癸"]);

const SIX_COMBINE = pairs(["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"]);
const CLASH = pairs(["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"]);
const HARM = pairs(["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"]);
const BREAK = pairs(["子酉", "丑辰", "寅亥", "卯午", "巳申", "未戌"]);
const WONJIN = pairs(["子未", "丑午", "寅酉", "卯申", "辰亥", "巳戌"]);
const PUNISH = pairs(["寅巳", "巳申", "寅申", "丑戌", "戌未", "丑未", "子卯"]);
const SELF_PUNISH = new Set(["辰", "午", "酉", "亥"]);
const TRINES: Branch[][] = [
  ["申", "子", "辰"],
  ["亥", "卯", "未"],
  ["寅", "午", "戌"],
  ["巳", "酉", "丑"],
];

export interface Relation {
  name: string;
  /** 좋음(+) / 긴장(-) / 둘 다 있는(0) */
  tone: 1 | 0 | -1;
}

export function stemRelation(a: Stem, b: Stem): Relation[] {
  const k = pairKey(a, b);
  const out: Relation[] = [];
  const comb = STEM_COMBINE_KEYS.get(k);
  if (comb) out.push({ name: `천간합(${comb})`, tone: 1 });
  if (STEM_CLASH.has(k)) out.push({ name: "천간충", tone: -1 });
  return out;
}

export function branchRelation(a: Branch, b: Branch): Relation[] {
  const k = pairKey(a, b);
  const out: Relation[] = [];
  if (SIX_COMBINE.has(k)) out.push({ name: "육합", tone: 1 });
  if (TRINES.some((t) => a !== b && t.includes(a) && t.includes(b))) out.push({ name: "삼합(반합)", tone: 1 });
  if (CLASH.has(k)) out.push({ name: "충", tone: -1 });
  if (PUNISH.has(k) || (a === b && SELF_PUNISH.has(a))) out.push({ name: a === b ? "자형" : "형", tone: -1 });
  if (HARM.has(k)) out.push({ name: "해", tone: -1 });
  if (BREAK.has(k)) out.push({ name: "파", tone: 0 });
  if (WONJIN.has(k)) out.push({ name: "원진", tone: -1 });
  return out;
}
