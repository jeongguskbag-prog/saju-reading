import {
  BRANCHES,
  CONTROLS,
  GENERATES,
  HIDDEN_STEMS,
  STEMS,
  STEM_ELEMENT,
  STEM_POLARITY,
  type Branch,
  type Stem,
  type TenGod,
} from "./constants";

export function tenGod(dayStem: Stem, target: Stem): TenGod {
  const de = STEM_ELEMENT[dayStem];
  const te = STEM_ELEMENT[target];
  const same = STEM_POLARITY[dayStem] === STEM_POLARITY[target];
  if (de === te) return same ? "비견" : "겁재";
  if (GENERATES[de] === te) return same ? "식신" : "상관";
  if (CONTROLS[de] === te) return same ? "편재" : "정재";
  if (CONTROLS[te] === de) return same ? "편관" : "정관";
  return same ? "편인" : "정인";
}

/** 지지의 십신은 정기(본기) 지장간 기준. */
export function branchTenGod(dayStem: Stem, branch: Branch): TenGod {
  const hidden = HIDDEN_STEMS[branch];
  return tenGod(dayStem, hidden[hidden.length - 1]);
}

export function splitGanZhi(gz: string): [Stem, Branch] {
  const stem = gz[0] as Stem;
  const branch = gz[1] as Branch;
  if (!STEMS.includes(stem) || !BRANCHES.includes(branch)) throw new Error(`잘못된 간지: ${gz}`);
  return [stem, branch];
}

/** 해당 연도의 세운 간지(입춘 이후 기준). */
export function yearGanZhi(year: number): [Stem, Branch] {
  const idx = (((year - 4) % 60) + 60) % 60;
  return [STEMS[idx % 10], BRANCHES[idx % 12]];
}

