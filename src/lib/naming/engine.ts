// 길운 개운 작명록의 계산 엔진. 같은 입력이면 언제나 같은 후보가 나온다(결정적).
// 획수·음·인명용 여부·자원오행은 hanja-data.json(Unihan + 천기록 엄선표, scripts/build-name-hanja.py)에서 읽고,
// AI는 이 계산 결과를 바꾸지 않고 뜻풀이 문장만 쓴다.
import type { SajuChart } from "../saju/calc";
import { ELEMENTS, GENERATES, CONTROLS, type Element } from "../saju/constants";
import DATA from "./hanja-data.json";
import { COMMON_SYLLABLES, GIVEN_NAMES } from "./given-names";

type Raw = { r: string[]; s: number; e: string; n?: string; m?: string; g?: "u" | "m" | "f"; t?: string[] };
const HANJA = DATA as unknown as Record<string, Raw>;

export type NamingMode = "baby" | "rename";
import { FEELINGS, FEELING_LABEL, SURNAMES, type Feeling } from "./request";
export { FEELINGS, FEELING_LABEL, SURNAMES, type Feeling };

export interface NamingRequest {
  mode: NamingMode;
  /** 성(한글). 예: "김", "남궁" */
  surname: string;
  /** 성(한자). 예: "金", "南宮" */
  surnameHanja: string;
  /** 돌림자(항렬자) */
  generation?: { hanja: string; reading: string; position: "first" | "second" } | null;
  feelings: Feeling[];
  /** 개명: 지금 이름(성 뺀 이름). 한자를 모르면 hanja 없이 */
  currentName?: { hangul: string; hanja?: string } | null;
}

export interface CharInfo {
  char: string;
  reading: string;
  /** 뜻(훈). 엄선 한자만 있다. */
  meaning?: string;
  /** 원획 */
  strokes: number;
  /** 자원오행 */
  element: Element | null;
  /** 발음오행(첫소리 기준) */
  sound: Element | null;
  /** 획수 홀수=양, 짝수=음 */
  yang: boolean;
}

export interface Grid {
  key: "won" | "hyeong" | "i" | "jeong";
  /** 원격·형격·이격·정격 */
  label: string;
  /** 초년·청년·중년·말년 */
  period: string;
  number: number;
  lucky: boolean;
  gloss: string;
}

export interface NameAnalysis {
  /** 한글 이름(성 뺀 이름) */
  hangul: string;
  /** 성 포함 한글 */
  full: string;
  chars: CharInfo[];
  surname: CharInfo[];
  grids: Grid[];
  /** 성→이름 첫소리 흐름 */
  soundFlow: { from: Element | null; to: Element | null; relation: Relation }[];
  /** 획수 음양이 섞였는지 */
  yinYangMixed: boolean;
  /** 사주와의 오행 궁합 */
  fit: { element: Element; role: "yongsin" | "huisin" | "missing" | "gisin" | "neutral" }[];
  score: number;
}

export type Relation = "상생" | "비화" | "상극" | "-";

export interface HangulName {
  name: string;
  meaning: string;
  soundFlow: Relation[];
}

export interface NamingComputed {
  basis: {
    yongsin: Element;
    huisin: Element;
    gisin: Element;
    /** 원국에 없는 오행 */
    missing: Element[];
    gender: "male" | "female";
  };
  candidates: NameAnalysis[];
  hangulNames: HangulName[];
  /** 개명일 때 지금 이름 풀이 */
  current: NameAnalysis | null;
  /** 돌림자가 있어 네 격을 모두 길수로 맞추지 못한 경우 */
  relaxed: boolean;
}

export class NamingError extends Error {}

/** 81수리 길흉과 짧은 풀이. 81을 넘으면 80을 뺀다. */
const SURI: Record<number, [boolean, string]> = {
  1: [true, "기본·출발"], 2: [false, "분리·동요"], 3: [true, "명예·지혜"], 4: [false, "부정·고난"], 5: [true, "복덕·화합"],
  6: [true, "계승·풍요"], 7: [true, "독립·추진"], 8: [true, "발달·인내"], 9: [false, "궁박·불안"], 10: [false, "공허·정체"],
  11: [true, "신성·번영"], 12: [false, "박약·고립"], 13: [true, "총명·재능"], 14: [false, "이산·고독"], 15: [true, "통솔·덕망"],
  16: [true, "덕망·재물"], 17: [true, "건창·강건"], 18: [true, "발전·성취"], 19: [false, "고난·장애"], 20: [false, "허망·공허"],
  21: [true, "두령·자립"], 22: [false, "중절·좌절"], 23: [true, "공명·융창"], 24: [true, "입신·재물"], 25: [true, "안강·지혜"],
  26: [false, "영웅·풍파"], 27: [false, "중단·비난"], 28: [false, "파란·이별"], 29: [true, "성공·재략"], 30: [false, "부몽·부침"],
  31: [true, "융창·지도"], 32: [true, "순풍·요행"], 33: [true, "승천·권위"], 34: [false, "파멸·변란"], 35: [true, "태평·온화"],
  36: [false, "영웅·파란"], 37: [true, "인덕·출세"], 38: [true, "복록·문예"], 39: [true, "안락·부귀"], 40: [false, "무상·변동"],
  41: [true, "대공·명망"], 42: [false, "고행·분산"], 43: [false, "미혹·산재"], 44: [false, "마장·난관"], 45: [true, "대지·순풍"],
  46: [false, "부지·곤궁"], 47: [true, "출세·전개"], 48: [true, "영달·지혜"], 49: [false, "은퇴·변화"], 50: [false, "부몽·성패"],
  51: [false, "성쇠·기복"], 52: [true, "약진·선견"], 53: [false, "내허·불화"], 54: [false, "신고·고난"], 55: [false, "미달·불안"],
  56: [false, "부족·곤란"], 57: [true, "노력·성취"], 58: [false, "만성·기복"], 59: [false, "불성·인내 부족"], 60: [false, "동요·암흑"],
  61: [true, "영화·재리"], 62: [false, "쇠퇴·고독"], 63: [true, "길상·순성"], 64: [false, "침체·고난"], 65: [true, "휘양·장수"],
  66: [false, "쇠망·불화"], 67: [true, "영달·자립"], 68: [true, "발명·명지"], 69: [false, "정체·불안"], 70: [false, "공허·적막"],
  71: [false, "만달·평범"], 72: [false, "상반·기복"], 73: [false, "평길·노력"], 74: [false, "우매·불우"], 75: [false, "정수·평범"],
  76: [false, "선곤·후곤"], 77: [false, "전후·기복"], 78: [false, "선길·후흉"], 79: [false, "궁극·부족"], 80: [false, "종결·은둔"],
  81: [true, "환원·최극"],
};

export const suri = (n: number) => {
  const k = ((n - 1) % 80) + 1;
  const [lucky, gloss] = SURI[k];
  return { number: n, lucky, gloss };
};

/** 관례상 이름에 잘 쓰지 않는 글자(불용문자). 추천에서는 빼고, 돌림자·지금 이름에는 그대로 쓴다. */
const AVOID = new Set([..."光九國菊吉男南冬東蘭末梅明文美福富四石雪星松順勝新實愛榮玉完龍雲月日一長貞珍眞天鐵春夏秋竹虎好花孝喜姬錦蓮豊年隱里沼中心"]);

/** 이름으로 읽혔을 때 피할 말(성 포함 또는 이름만) */
const BAD_WORDS = ["사망", "고자", "변태", "병신", "장애", "조지", "지랄", "방구", "똥", "시발", "개새", "죽음", "망해", "사기", "도둑", "하수", "기생", "상실", "구토", "설사", "치질", "성기", "자지", "보지", "유방", "음모", "신음", "주사", "외도", "이혼", "부도", "파산"];

/** 발음오행(운해본): ㄱㅋ 木, ㄴㄷㄹㅌ 火, ㅇㅎ 土, ㅅㅈㅊ 金, ㅁㅂㅍ 水 */
const CHO_ELEMENT: Record<number, Element> = {
  0: "wood", 1: "wood", 15: "wood",
  2: "fire", 3: "fire", 4: "fire", 5: "fire", 16: "fire",
  11: "earth", 18: "earth",
  9: "metal", 10: "metal", 12: "metal", 13: "metal", 14: "metal",
  6: "water", 7: "water", 8: "water", 17: "water",
};

export function soundElement(syllable: string): Element | null {
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code >= 11172) return null;
  return CHO_ELEMENT[Math.floor(code / 588)] ?? null;
}

export function relation(a: Element | null, b: Element | null): Relation {
  if (!a || !b) return "-";
  if (a === b) return "비화";
  if (GENERATES[a] === b || GENERATES[b] === a) return "상생";
  if (CONTROLS[a] === b || CONTROLS[b] === a) return "상극";
  return "-";
}

const isElement = (e: string): e is Element => (ELEMENTS as string[]).includes(e);

/** 한자 한 글자 정보. 인명용 한자가 아니면 null. reading을 주면 그 음이 인명용 음인지도 본다. */
export function lookup(char: string, reading?: string): CharInfo | null {
  const raw = HANJA[char];
  if (!raw) return null;
  const r = reading ?? raw.n ?? raw.r[0];
  if (reading && !raw.r.includes(reading)) return null;
  return {
    char,
    reading: r,
    meaning: raw.m,
    strokes: raw.s,
    element: isElement(raw.e) ? raw.e : null,
    sound: soundElement(r),
    yang: raw.s % 2 === 1,
  };
}

/** 이 한자를 이름에 쓸 수 있는 음 목록(인명용). 없으면 빈 배열. */
export const readingsOf = (char: string): string[] => HANJA[char]?.r ?? [];

/** 순한글 이름 후보(천기록 엄선). g: u 공용, m 남, f 여 */
const HANGUL_NAMES: { name: string; meaning: string; g: "u" | "m" | "f"; t: Feeling[] }[] = [
  { name: "하늘", meaning: "넓고 푸른 하늘처럼 큰 뜻을 품으라는 이름", g: "u", t: ["자연", "성취"] },
  { name: "가온", meaning: "세상의 가운데, 중심이 되는 사람", g: "u", t: ["품격", "성취"] },
  { name: "다온", meaning: "좋은 일이 다 온다", g: "u", t: ["재복", "밝음"] },
  { name: "라온", meaning: "즐겁고 기쁜", g: "u", t: ["밝음", "온화"] },
  { name: "나래", meaning: "날개처럼 마음껏 펼쳐 나아가는", g: "f", t: ["성취", "자연"] },
  { name: "누리", meaning: "온 세상을 누리며 사는", g: "u", t: ["재복", "성취"] },
  { name: "한결", meaning: "처음과 끝이 한결같은", g: "u", t: ["품격", "강건"] },
  { name: "한별", meaning: "크고 밝은 별", g: "u", t: ["밝음", "성취"] },
  { name: "이룸", meaning: "뜻한 바를 이루는", g: "u", t: ["성취"] },
  { name: "온유", meaning: "따뜻하고 부드러운 마음", g: "u", t: ["온화"] },
  { name: "로운", meaning: "슬기롭고 지혜로운", g: "u", t: ["지혜"] },
  { name: "아라", meaning: "넓고 깊은 바다", g: "f", t: ["자연", "품격"] },
  { name: "단비", meaning: "꼭 필요할 때 내리는 반가운 비", g: "f", t: ["자연", "온화"] },
  { name: "별하", meaning: "별과 하늘을 함께 품은", g: "f", t: ["밝음", "자연"] },
  { name: "솔빛", meaning: "소나무처럼 늘 푸르고 빛나는", g: "u", t: ["강건", "밝음"] },
  { name: "슬기", meaning: "사리를 밝게 헤아리는 지혜", g: "u", t: ["지혜"] },
  { name: "빛나", meaning: "빛이 나는 사람", g: "f", t: ["밝음"] },
  { name: "새봄", meaning: "새로 시작하는 봄의 기운", g: "f", t: ["자연", "밝음"] },
  { name: "푸름", meaning: "늘 푸르고 싱그러운", g: "u", t: ["자연"] },
  { name: "든솔", meaning: "든든한 소나무처럼 믿음직한", g: "m", t: ["강건", "품격"] },
  { name: "한울", meaning: "크고 넓은 울타리, 온 세상", g: "m", t: ["품격", "성취"] },
  { name: "태양", meaning: "세상을 밝히는 해", g: "m", t: ["밝음", "강건"] },
  { name: "우람", meaning: "크고 씩씩한", g: "m", t: ["강건"] },
  { name: "다솜", meaning: "애틋하게 사랑하는 마음", g: "f", t: ["온화"] },
  { name: "예솔", meaning: "예쁘고 곧은 소나무", g: "f", t: ["품격", "자연"] },
  { name: "하람", meaning: "하늘이 내린 소중한 사람", g: "u", t: ["재복", "품격"] },
  { name: "그린", meaning: "그리워하고 아끼는", g: "u", t: ["온화"] },
  { name: "도담", meaning: "어린아이가 탈 없이 잘 자라는 모양", g: "u", t: ["재복", "강건"] },
  { name: "마루", meaning: "높은 꼭대기, 으뜸", g: "m", t: ["성취", "품격"] },
  { name: "시온", meaning: "시원하고 온화한", g: "u", t: ["온화", "밝음"] },
];

const SURNAME_STROKES_OVERRIDE: Record<string, number> = {};

function surnameChars(req: NamingRequest): CharInfo[] {
  const hanja = [...req.surnameHanja];
  const hangul = [...req.surname];
  if (hanja.length !== hangul.length || hanja.length < 1 || hanja.length > 2) throw new NamingError("성씨 한자를 확인해 주세요.");
  return hanja.map((c, i) => {
    const raw = HANJA[c];
    if (!raw) throw new NamingError(`성씨 한자 ${c}의 획수를 찾지 못했습니다.`);
    return {
      char: c,
      reading: hangul[i],
      strokes: SURNAME_STROKES_OVERRIDE[c] ?? raw.s,
      element: isElement(raw.e) ? raw.e : null,
      sound: soundElement(hangul[i]),
      yang: raw.s % 2 === 1,
    };
  });
}

const GRID_META: { key: Grid["key"]; label: string; period: string }[] = [
  { key: "won", label: "원격(元格)", period: "초년운" },
  { key: "hyeong", label: "형격(亨格)", period: "청년운" },
  { key: "i", label: "이격(利格)", period: "중년운" },
  { key: "jeong", label: "정격(貞格)", period: "말년·총운" },
];

/** 원형이정 4격. 원격=이름 두 글자, 형격=성+이름 첫 글자, 이격=성+이름 끝 글자, 정격=전체 */
export function fourGrids(surname: number, a: number, b: number): Grid[] {
  const nums = { won: a + b, hyeong: surname + a, i: surname + b, jeong: surname + a + b };
  return GRID_META.map((m) => ({ ...m, ...suri(nums[m.key]) }));
}

function roleOf(e: Element | null, c: NamingComputed["basis"]): NameAnalysis["fit"][number]["role"] {
  if (!e) return "neutral";
  if (e === c.yongsin) return "yongsin";
  if (e === c.huisin) return "huisin";
  if (e === c.gisin) return "gisin";
  if (c.missing.includes(e)) return "missing";
  return "neutral";
}

const ROLE_SCORE = { yongsin: 3, huisin: 2, missing: 1, neutral: 0, gisin: -4 } as const;

export function analyzeName(surname: CharInfo[], chars: CharInfo[], basis: NamingComputed["basis"], feelings: Feeling[] = []): NameAnalysis {
  const sum = surname.reduce((s, c) => s + c.strokes, 0);
  const grids = chars.length === 2 ? fourGrids(sum, chars[0].strokes, chars[1].strokes) : fourGrids(sum, chars[0]?.strokes ?? 0, 0);
  const lastSurname = surname[surname.length - 1];
  const seq = [lastSurname, ...chars];
  const soundFlow = seq.slice(1).map((c, i) => ({ from: seq[i].sound, to: c.sound, relation: relation(seq[i].sound, c.sound) }));
  const all = [...surname, ...chars];
  const yinYangMixed = all.some((c) => c.yang) && all.some((c) => !c.yang);
  const fit = chars.filter((c) => c.element).map((c) => ({ element: c.element!, role: roleOf(c.element, basis) }));

  let score = 0;
  for (const g of grids) score += g.lucky ? 2 : -6;
  for (const f of fit) score += ROLE_SCORE[f.role];
  for (const s of soundFlow) score += s.relation === "상생" ? 2 : s.relation === "비화" ? 0.5 : s.relation === "상극" ? -2 : 0;
  score += yinYangMixed ? 1 : -3;
  for (const c of chars) {
    const tags = HANJA[c.char]?.t ?? [];
    score += Math.min(3, feelings.filter((f) => tags.includes(f)).length * 1.5);
  }
  const hangul = chars.map((c) => c.reading).join("");
  return {
    hangul,
    full: surname.map((c) => c.reading).join("") + hangul,
    chars,
    surname,
    grids,
    soundFlow,
    yinYangMixed,
    fit,
    score: Math.round(score * 10) / 10,
  };
}

function poolFor(gender: "male" | "female"): CharInfo[] {
  const out: CharInfo[] = [];
  for (const [char, raw] of Object.entries(HANJA)) {
    if (!raw.n || AVOID.has(char)) continue;
    if (gender === "male" && raw.g === "f") continue;
    if (gender === "female" && raw.g === "m") continue;
    const info = lookup(char, raw.n);
    if (info) out.push(info);
  }
  // 결정적인 순서(코드 포인트)
  return out.sort((a, b) => a.char.localeCompare(b.char));
}

const badName = (full: string, given: string) => BAD_WORDS.some((w) => full.includes(w) || given.includes(w));

export function computeNaming(chart: SajuChart, req: NamingRequest): NamingComputed {
  const u = chart.analysis.usefulness;
  const basis: NamingComputed["basis"] = {
    yongsin: u.yongsin,
    huisin: u.huisin,
    gisin: u.gisin,
    missing: ELEMENTS.filter((e) => chart.elements.counts[e] === 0),
    gender: chart.input.gender,
  };
  const surname = surnameChars(req);
  const surnameReading = surname.map((c) => c.reading).join("");
  const pool = poolFor(basis.gender);

  let gen: CharInfo | null = null;
  if (req.generation) {
    gen = lookup(req.generation.hanja, req.generation.reading);
    if (!gen) throw new NamingError("돌림자가 인명용 한자가 아니거나 음이 맞지 않습니다. 한자와 음을 확인해 주세요.");
  }

  const currentHangul = req.mode === "rename" ? (req.currentName?.hangul ?? "") : "";
  // 소리: 많이 쓰는 이름(1순위) → 이름에 흔한 글자끼리의 조합(2순위)만 쓴다. 어색한 소리는 처음부터 빼 둔다.
  const sounds = GIVEN_NAMES[basis.gender];
  const tierOfSound = (n: string): 0 | 1 | 2 => (sounds.has(n) ? 0 : [...n].every((x) => COMMON_SYLLABLES.has(x)) ? 1 : 2);
  const soundTier = new Map<string, number>();
  const scored: NameAnalysis[] = [];
  const firsts = gen && req.generation!.position === "first" ? [gen] : pool;
  const seconds = gen && req.generation!.position === "second" ? [gen] : pool;
  for (const a of firsts) {
    for (const b of seconds) {
      if (a.char === b.char || a.reading === b.reading) continue;
      if (surnameReading.endsWith(a.reading)) continue;
      const given = a.reading + b.reading;
      const tier = tierOfSound(given);
      if (tier === 2) continue;
      if (given === currentHangul) continue;
      if (badName(surnameReading + given, given)) continue;
      const an = analyzeName(surname, [a, b], basis, req.feelings);
      // 기신 오행 글자는 이름에 넣지 않는다(돌림자는 예외).
      if (an.fit.some((f, i) => f.role === "gisin" && !(gen && [a, b][i] === gen))) continue;
      scored.push(an);
      soundTier.set(an.hangul, tier);
    }
  }

  const luckyCount = (n: NameAnalysis) => n.grids.filter((g) => g.lucky).length;
  // 순서: ① 네 격 모두 길수 ② 많이 쓰는 이름 소리 ③ 점수. 돌림자가 있어 네 격을 맞추기 어려우면 세 격 길수까지 넓힌다.
  const enough = scored.filter((n) => luckyCount(n) === 4).length >= 5;
  const relaxed = !enough && Boolean(gen);
  const ranked = scored
    .filter((n) => luckyCount(n) === 4 || (relaxed && luckyCount(n) === 3))
    .sort(
      (x, y) =>
        luckyCount(y) - luckyCount(x) ||
        (soundTier.get(x.hangul) ?? 1) - (soundTier.get(y.hangul) ?? 1) ||
        y.score - x.score ||
        x.full.localeCompare(y.full),
    );

  // 다양하게: 같은 한자는 두 번까지, 같은 한글 이름은 한 번만.
  const used = new Map<string, number>();
  const seenHangul = new Set<string>();
  const candidates: NameAnalysis[] = [];
  for (const n of ranked) {
    if (candidates.length >= 5) break;
    if (seenHangul.has(n.hangul)) continue;
    const free = n.chars.filter((c) => c !== gen);
    if (free.some((c) => (used.get(c.char) ?? 0) >= 1)) continue;
    candidates.push(n);
    seenHangul.add(n.hangul);
    for (const c of free) used.set(c.char, (used.get(c.char) ?? 0) + 1);
  }
  if (candidates.length === 0) throw new NamingError("조건에 맞는 이름을 찾지 못했습니다. 돌림자나 느낌 조건을 줄여 다시 신청해 주세요.");

  // 순한글 이름: 성과 첫소리 흐름이 좋은 것, 느낌이 맞는 것 순
  const lastSurnameSound = surname[surname.length - 1].sound;
  const hangulNames = HANGUL_NAMES.filter((h) => h.g === "u" || (h.g === "m") === (basis.gender === "male"))
    .map((h) => {
      const syl = [...h.name];
      const flow = [relation(lastSurnameSound, soundElement(syl[0])), relation(soundElement(syl[0]), soundElement(syl[1]))];
      const s =
        flow.reduce((t, r) => t + (r === "상생" ? 2 : r === "상극" ? -2 : r === "비화" ? 0.5 : 0), 0) +
        h.t.filter((t) => req.feelings.includes(t)).length * 1.5;
      return { h, flow, s };
    })
    .filter((x) => !surnameReading.endsWith([...x.h.name][0]))
    .sort((a, b) => b.s - a.s || a.h.name.localeCompare(b.h.name))
    .slice(0, 3)
    .map(({ h, flow }) => ({ name: h.name, meaning: h.meaning, soundFlow: flow }));

  let current: NameAnalysis | null = null;
  if (req.mode === "rename" && req.currentName?.hangul) {
    const syl = [...req.currentName.hangul];
    const hanja = req.currentName.hanja ? [...req.currentName.hanja] : [];
    const chars: CharInfo[] = syl.map((s, i) => {
      const info = hanja[i] ? lookup(hanja[i]) : null;
      if (info) return { ...info, reading: s, sound: soundElement(s) };
      return { char: hanja[i] ?? "", reading: s, strokes: 0, element: null, sound: soundElement(s), yang: false };
    });
    current = analyzeName(surname, chars, basis, req.feelings);
    // 한자를 모르면 수리(획수)는 볼 수 없다.
    if (!hanja.length || chars.some((c) => !c.strokes)) current = { ...current, grids: [] };
  }

  return { basis, candidates, hangulNames, current, relaxed };
}
