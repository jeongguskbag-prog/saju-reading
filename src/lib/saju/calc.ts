import { Lunar, LunarMonth, LunarYear, Solar } from "lunar-javascript";
import { analyze, type Analysis } from "./analysis";
import { computeGrade, type Grade } from "./grade";
import { branchTenGod, splitGanZhi, tenGod, yearGanZhi } from "./gods";
import { engineText, REGION_INFO, tzOffsetMinutes, type EngineText, type Locale, type Region } from "./locale";
import {
  BRANCHES,
  BRANCH_ANIMAL,
  BRANCH_ELEMENT,
  BRANCH_KO,
  CONTROLS,
  ELEMENTS,
  GENERATES,
  HIDDEN_STEMS,
  STEMS,
  STEM_ELEMENT,
  STEM_KO,
  STEM_POLARITY,
  type Branch,
  type Element,
  type Stem,
  type TenGod,
} from "./constants";

export interface BirthInput {
  name?: string;
  gender: "male" | "female";
  calendar: "solar" | "lunar";
  year: number;
  month: number;
  day: number;
  /** 음력 입력일 때 윤달 여부 */
  isLeapMonth?: boolean;
  /** 0~23, 모르면 null */
  hour: number | null;
  minute?: number | null;
  /** 출생 지역(시간대·기본 경도). 기본 KR */
  region?: Region;
  /** 결과 문장의 언어. 기본 ko */
  locale?: Locale;
  /** 손님이 선택해서 알려 준 생활 상황(선택). 애정·가족 풀이의 조언을 맞추는 데만 쓴다. */
  life?: {
    marital?: "married" | "dating" | "single";
    children?: boolean;
  };
  options?: {
    /** 출생지 경도로 진태양시(평균태양시) 보정. 기본 true */
    solarTimeCorrection?: boolean;
    /** 출생지 경도(동경). 기본: 지역 대표 도시(서울 126.98, 타이베이 121.56, 홍콩 114.17) */
    longitude?: number;
    /** 자시 일주 변경 기준. at23: 23시에 다음 날 일주(기본), at0: 야자시(자정에 변경) */
    dayBoundary?: "at23" | "at0";
  };
}

export interface HiddenStem {
  stem: Stem;
  stemKo: string;
  element: Element;
  tenGod: TenGod;
}

export interface Pillar {
  label: "시주" | "일주" | "월주" | "년주";
  stem: Stem;
  branch: Branch;
  stemKo: string;
  branchKo: string;
  stemElement: Element;
  branchElement: Element;
  /** 일간 자신은 null */
  stemTenGod: TenGod | null;
  branchTenGod: TenGod;
  hiddenStems: HiddenStem[];
}

export interface LuckPillar {
  stem: Stem;
  branch: Branch;
  ko: string;
  stemTenGod: TenGod;
  branchTenGod: TenGod;
}

export interface DaeunPeriod extends LuckPillar {
  /** 대운 시작 나이(만) */
  startAge: number;
  startYear: number;
  endYear: number;
}

export interface SajuChart {
  input: BirthInput;
  solarDate: string;
  lunarDate: string;
  /** 결과 문장의 언어 */
  locale: Locale;
  /** 사주 계산에 실제로 쓴 시각 설명 */
  timeNote: string | null;
  pillars: { hour: Pillar | null; day: Pillar; month: Pillar; year: Pillar };
  dayMaster: { stem: Stem; ko: string; element: Element; polarity: "yang" | "yin" };
  zodiac: string;
  elements: {
    /** 겉으로 드러난 글자(천간+지지) 개수 */
    counts: Record<Element, number>;
    /** 지장간을 포함한 가중 점수(천간 1, 지지는 지장간에 나눠 1) */
    weighted: Record<Element, number>;
  };
  tenGodCounts: Partial<Record<TenGod, number>>;
  strength: { score: number; label: string };
  daeun: { forward: boolean; startAge: number; periods: DaeunPeriod[]; current: DaeunPeriod | null };
  yearLuck: LuckPillar & { year: number };
  /** 격국·참고 용신·대운 점수·월별 흐름·개운 요소 */
  analysis: Analysis;
  /** 사주 등급·희소도 */
  grade: Grade;
  warnings: string[];
}

export { tenGod, branchTenGod, splitGanZhi, yearGanZhi } from "./gods";

export class InputError extends Error {}

/**
 * 한국 표준시의 UTC 오프셋(분). 1954-03-21~1961-08-09의 UTC+8:30과
 * 1987·1988년 서머타임을 반영한다. 그 밖의 과거 서머타임은 반영하지 않는다.
 */
export function koreaUtcOffsetMinutes(y: number, m: number, d: number, h: number, mi: number): number {
  const t = Date.UTC(y, m - 1, d, h, mi);
  if (t >= Date.UTC(1954, 2, 21) && t < Date.UTC(1961, 7, 10)) return 510;
  if (t >= Date.UTC(1987, 4, 10, 2) && t < Date.UTC(1987, 9, 11, 3)) return 600;
  if (t >= Date.UTC(1988, 4, 8, 2) && t < Date.UTC(1988, 9, 9, 3)) return 600;
  return 540;
}

function fieldsOf(ms: number) {
  const d = new Date(ms);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth() + 1,
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
    s: d.getUTCSeconds(),
  };
}

function solarFromMs(ms: number): Solar {
  const f = fieldsOf(ms);
  return Solar.fromYmdHms(f.y, f.m, f.d, f.h, f.mi, f.s);
}

const pad = (n: number) => String(n).padStart(2, "0");

function resolveSolarDate(input: BirthInput, T: EngineText): { y: number; m: number; d: number } {
  const { year, month, day } = input;
  if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new InputError(T.yearRange);
  if (input.calendar === "solar") {
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) throw new InputError(T.badSolarDate);
    return { y: year, m: month, d: day };
  }
  if (input.isLeapMonth && LunarYear.fromYear(year).getLeapMonth() !== month) {
    throw new InputError(T.noLeapMonth(year, month));
  }
  const lm = input.isLeapMonth ? -month : month;
  const lunarMonth = LunarMonth.fromYm(year, lm);
  if (!lunarMonth || day < 1 || day > lunarMonth.getDayCount()) throw new InputError(T.badLunarDate);
  const s = Lunar.fromYmd(year, lm, day).getSolar();
  return { y: s.getYear(), m: s.getMonth(), d: s.getDay() };
}

/** 양력 날짜가 한국 시간(또는 offsetMinutes 시간대) 기준 오늘보다 뒤인지. */
export function isAfterTodayInKorea(date: { y: number; m: number; d: number }, now: Date, offsetMinutes = 540): boolean {
  const today = new Date(now.getTime() + offsetMinutes * 60_000);
  const todayKey = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();
  return date.y * 10000 + date.m * 100 + date.d > todayKey;
}

function makePillar(label: Pillar["label"], gz: string, dayStem: Stem, isDay = false): Pillar {
  const [stem, branch] = splitGanZhi(gz);
  return {
    label,
    stem,
    branch,
    stemKo: STEM_KO[stem],
    branchKo: BRANCH_KO[branch],
    stemElement: STEM_ELEMENT[stem],
    branchElement: BRANCH_ELEMENT[branch],
    stemTenGod: isDay ? null : tenGod(dayStem, stem),
    branchTenGod: branchTenGod(dayStem, branch),
    hiddenStems: HIDDEN_STEMS[branch].map((hs) => ({
      stem: hs,
      stemKo: STEM_KO[hs],
      element: STEM_ELEMENT[hs],
      tenGod: tenGod(dayStem, hs),
    })),
  };
}

function luckPillar(stem: Stem, branch: Branch, dayStem: Stem): LuckPillar {
  return {
    stem,
    branch,
    ko: STEM_KO[stem] + BRANCH_KO[branch],
    stemTenGod: tenGod(dayStem, stem),
    branchTenGod: branchTenGod(dayStem, branch),
  };
}

function strengthLabelKo(score: number): string {
  if (score < 20) return "극신약";
  if (score < 40) return "신약";
  if (score <= 60) return "중화";
  if (score <= 80) return "신강";
  return "극신강";
}

export function calculateSaju(input: BirthInput, now: Date = new Date(), internal: { skipMonthly?: boolean } = {}): SajuChart {
  const warnings: string[] = [];
  const locale: Locale = input.locale ?? "ko";
  const region: Region = input.region ?? "KR";
  const zone = REGION_INFO[region];
  const T = engineText(locale);
  const opts = input.options ?? {};
  const correction = opts.solarTimeCorrection ?? true;
  const longitude = opts.longitude ?? zone.longitude;
  const sect: 1 | 2 = (opts.dayBoundary ?? "at23") === "at23" ? 1 : 2;
  const timeKnown = input.hour !== null && input.hour !== undefined;

  if (timeKnown && (!Number.isInteger(input.hour) || input.hour! < 0 || input.hour! > 23)) {
    throw new InputError(T.badHour);
  }
  const minute = input.minute ?? 0;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new InputError(T.badMinute);

  const date = resolveSolarDate(input, T);
  if (isAfterTodayInKorea(date, now, zone.standardOffset)) throw new InputError(T.futureDate);
  const clockH = timeKnown ? input.hour! : 12;
  const clockM = timeKnown ? minute : 0;

  // 출생 순간(UTC).
  // 한국은 법령 기준 표(koreaUtcOffsetMinutes), 대만·홍콩은 시간대 데이터(과거 서머타임 포함)를 쓴다.
  const offset =
    region === "KR"
      ? koreaUtcOffsetMinutes(date.y, date.m, date.d, clockH, clockM)
      : tzOffsetMinutes(zone.timeZone, date.y, date.m, date.d, clockH, clockM);
  const utcMs = Date.UTC(date.y, date.m - 1, date.d, clockH, clockM) - offset * 60_000;
  const offsetNote = T.offsetNote(region, offset);
  if (offsetNote) warnings.push(offsetNote);

  // 년·월주와 대운: 절기 시각이 중국 표준시(UTC+8) 기준이므로 같은 순간을 UTC+8로 바꿔 계산.
  const beijingSolar = solarFromMs(utcMs + 8 * 3_600_000);
  const beijingEc = beijingSolar.getLunar().getEightChar();

  // 일·시주: 출생지의 평균태양시(보정 시) 또는 표준시 시계 기준.
  const localMs = correction ? utcMs + longitude * 4 * 60_000 : utcMs + zone.standardOffset * 60_000;
  const localSolar = timeKnown ? solarFromMs(localMs) : Solar.fromYmdHms(date.y, date.m, date.d, 12, 0, 0);
  const localEc = localSolar.getLunar().getEightChar();
  localEc.setSect(sect);

  const dayStem = splitGanZhi(localEc.getDay())[0];
  const pillars = {
    year: makePillar("년주", beijingEc.getYear(), dayStem),
    month: makePillar("월주", beijingEc.getMonth(), dayStem),
    day: makePillar("일주", localEc.getDay(), dayStem, true),
    hour: timeKnown ? makePillar("시주", localEc.getTime(), dayStem) : null,
  };

  let timeNote: string | null = null;
  if (timeKnown) {
    const f = fieldsOf(localMs);
    timeNote = correction ? T.timeNoteCorrected(f, longitude) : T.timeNoteClock(zone.standardOffset, f.h, f.mi);
  } else {
    warnings.push(T.noHour);
    // 절입일이면 시각에 따라 월주가 달라질 수 있다.
    const lunar = Solar.fromYmd(date.y, date.m, date.d).getLunar();
    const jie = lunar.getPrevJie(true).getSolar();
    const jieNext = lunar.getNextJie(true).getSolar();
    for (const s of [jie, jieNext]) {
      if (s.getYear() === date.y && s.getMonth() === date.m && Math.abs(s.getDay() - date.d) <= 1) {
        warnings.push(T.jieBoundary);
        break;
      }
    }
  }

  const order = [pillars.hour, pillars.day, pillars.month, pillars.year].filter((p): p is Pillar => p !== null);

  // 오행 분포.
  const counts = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  const weighted = Object.fromEntries(ELEMENTS.map((e) => [e, 0])) as Record<Element, number>;
  for (const p of order) {
    counts[p.stemElement] += 1;
    counts[p.branchElement] += 1;
    weighted[p.stemElement] += 1;
    for (const hs of p.hiddenStems) weighted[hs.element] += 1 / p.hiddenStems.length;
  }
  for (const e of ELEMENTS) weighted[e] = Math.round(weighted[e] * 100) / 100;

  // 십신 분포(일간 제외, 지지는 정기 기준).
  const tenGodCounts: Partial<Record<TenGod, number>> = {};
  const bump = (g: TenGod) => (tenGodCounts[g] = (tenGodCounts[g] ?? 0) + 1);
  for (const p of order) {
    if (p.stemTenGod) bump(p.stemTenGod);
    bump(p.branchTenGod);
  }

  // 신강·신약(참고용): 일간을 돕는 글자(비겁·인성) 비중. 월지 3, 일지 1.5, 그 외 1.
  const dayEl = STEM_ELEMENT[dayStem];
  const supports = (e: Element) => e === dayEl || GENERATES[e] === dayEl;
  let total = 0;
  let support = 0;
  const add = (e: Element, w: number) => {
    total += w;
    if (supports(e)) support += w;
  };
  for (const p of order) {
    if (p !== pillars.day) add(p.stemElement, 1);
    const w = p === pillars.month ? 3 : p === pillars.day ? 1.5 : 1;
    add(p.branchElement, w);
  }
  const score = Math.round((support / total) * 100);

  // 대운.
  const yun = beijingEc.getYun(input.gender === "male" ? 1 : 0, 2);
  const birthYear = beijingSolar.getYear();
  const periods: DaeunPeriod[] = yun
    .getDaYun(9)
    .slice(1)
    .map((d) => {
      const [s, b] = splitGanZhi(d.getGanZhi());
      return {
        ...luckPillar(s, b, dayStem),
        startAge: d.getStartYear() - birthYear,
        startYear: d.getStartYear(),
        endYear: d.getEndYear(),
      };
    });
  const thisYear = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear();
  const current = periods.find((p) => p.startYear <= thisYear && thisYear <= p.endYear) ?? null;
  const [ys, yb] = yearGanZhi(thisYear);

  const lunar = Solar.fromYmd(date.y, date.m, date.d).getLunar();
  const lunarMonth = lunar.getMonth();
  const lunarDate = T.lunarDate(lunar.getYear(), Math.abs(lunarMonth), lunar.getDay(), lunarMonth < 0);
  if (input.calendar === "lunar") warnings.push(T.lunarLibrary(region));

  const analysis = analyze({ pillars, weighted, tenGodCounts, strengthScore: score, daeun: periods, now, skipMonthly: internal.skipMonthly, locale });
  const grade = computeGrade({ pillars, counts, weighted, strengthScore: score, analysis, gyeokguk: analysis.gyeokguk.name, locale });

  return {
    input,
    locale,
    solarDate: `${date.y}-${pad(date.m)}-${pad(date.d)}`,
    lunarDate,
    timeNote,
    pillars,
    dayMaster: { stem: dayStem, ko: STEM_KO[dayStem], element: dayEl, polarity: STEM_POLARITY[dayStem] },
    zodiac: T.zodiac(BRANCH_ANIMAL[pillars.year.branch]),
    elements: { counts, weighted },
    tenGodCounts,
    strength: { score, label: T.strength(strengthLabelKo(score)) },
    daeun: { forward: yun.isForward(), startAge: periods[0]?.startAge ?? 0, periods, current },
    yearLuck: { ...luckPillar(ys, yb, dayStem), year: thisYear },
    analysis,
    grade,
    warnings,
  };
}
