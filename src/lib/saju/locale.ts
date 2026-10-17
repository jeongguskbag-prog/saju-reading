// 언어(ko, zh-Hant 번체, zh-Hans 간체, en 영어)와 출생 지역(KR, TW, HK, CN). 엔진 내부 값(십신·격국 이름 등)은 한국어 키를 그대로 쓰고,
// 화면과 감정서에 나가는 문장만 언어별로 만든다.
import type { Element, TenGod } from "./constants";

export type Locale = "ko" | "zh-Hant" | "zh-Hans" | "en";
export type ZhLocale = "zh-Hant" | "zh-Hans";
/** 한국어가 아닌 언어(엔진 문장을 표로 바꿔 쓰는 언어) */
export type ForeignLocale = Exclude<Locale, "ko">;
export type Region = "KR" | "TW" | "HK" | "CN";

export const LOCALES: Locale[] = ["ko", "zh-Hant", "zh-Hans", "en"];
export const REGIONS: Region[] = ["KR", "TW", "HK", "CN"];

export const isZh = (locale: Locale | undefined): locale is ZhLocale => locale === "zh-Hant" || locale === "zh-Hans";

export const REGION_INFO: Record<Region, { timeZone: string; standardOffset: number; longitude: number }> = {
  KR: { timeZone: "Asia/Seoul", standardOffset: 540, longitude: 126.98 },
  TW: { timeZone: "Asia/Taipei", standardOffset: 480, longitude: 121.56 },
  HK: { timeZone: "Asia/Hong_Kong", standardOffset: 480, longitude: 114.17 },
  CN: { timeZone: "Asia/Shanghai", standardOffset: 480, longitude: 116.4 },
};

/** 십신의 번체 표기. 편관은 대만·홍콩에서 흔히 쓰는 七殺로 적는다. */
export const TEN_GOD_ZH: Record<TenGod, string> = {
  비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官", 편재: "偏財",
  정재: "正財", 편관: "七殺", 정관: "正官", 편인: "偏印", 정인: "正印",
};

export const ELEMENT_ZH: Record<Element, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };

export const tenGodName = (g: TenGod, locale: Locale) => (locale === "ko" ? g : foreignTables(locale).tenGod[g]);

/** 격국 이름(내부 키는 한국어 "정관격", "건록격" 등)을 언어에 맞게. */
export function gyeokgukLabel(name: string, locale: Locale): string {
  if (locale === "ko") return name;
  if (locale === "en") {
    if (name === "건록격") return "Prosperous Root structure (建祿格)";
    if (name === "양인격") return "Yang Blade structure (羊刃格)";
    const g = name.replace(/격$/, "") as TenGod;
    return `${TEN_GOD_EN[g] ?? g} structure (${TEN_GOD_ZH[g] ?? g}格)`;
  }
  if (name === "건록격") return locale === "zh-Hans" ? "建禄格" : "建祿格";
  if (name === "양인격") return "羊刃格";
  const god = name.replace(/격$/, "") as TenGod;
  return `${zhTables(locale).tenGod[god] ?? god}格`;
}

/** 십신의 현대적 해석(번체). 한국어는 analysis.ts의 TEN_GOD_MODERN. */
export const TEN_GOD_MODERN_ZH: Record<TenGod, string> = {
  비견: "獨立心與自主性",
  겁재: "競爭心與強大的執行力",
  식신: "專業能力與穩定的產出力",
  상관: "創意表達力與個人品牌天賦",
  편재: "專案型的創收能力與投資敏感度",
  정재: "穩健的資產管理與踏實的累積",
  편관: "危機應變力與突破型領導力",
  정관: "原則感、責任感與組織適應力",
  편인: "專業企劃力與與眾不同的直覺",
  정인: "學習力、包容力與贏得信任的力量",
};

export const LUCKY_BY_ELEMENT_ZH: Record<Element, { colors: string; numbers: string; direction: string; habits: string }> = {
  wood: { colors: "綠色・青綠色", numbers: "3, 8", direction: "東方", habits: "晨間散步、照顧植物、開始新的學習" },
  fire: { colors: "紅色・橘色・紫色", numbers: "2, 7", direction: "南方", habits: "多曬太陽、與人交流、發表與表達" },
  earth: { colors: "黃色・土黃・米色", numbers: "5, 10", direction: "中央（住家・辦公室中心）", habits: "規律用餐、整理行程、養成儲蓄習慣" },
  metal: { colors: "白色・銀色・金色", numbers: "4, 9", direction: "西方", habits: "整理收納、呼吸運動、建立原則" },
  water: { colors: "黑色・深藍", numbers: "1, 6", direction: "北方", habits: "充足睡眠、閱讀與冥想、多喝水" },
};

export const ZODIAC_ZH: Record<string, string> = {
  쥐: "鼠", 소: "牛", 호랑이: "虎", 토끼: "兔", 용: "龍", 뱀: "蛇",
  말: "馬", 양: "羊", 원숭이: "猴", 닭: "雞", 개: "狗", 돼지: "豬",
};

const STRENGTH_ZH: Record<string, string> = { 극신약: "極身弱", 신약: "身弱", 중화: "中和", 신강: "身強", 극신강: "極身強" };

/** 십신의 간체 표기. */
export const TEN_GOD_HANS: Record<TenGod, string> = {
  비견: "比肩", 겁재: "劫财", 식신: "食神", 상관: "伤官", 편재: "偏财",
  정재: "正财", 편관: "七杀", 정관: "正官", 편인: "偏印", 정인: "正印",
};

/** 십신의 현대적 해석(간체). 한국어는 analysis.ts의 TEN_GOD_MODERN. */
export const TEN_GOD_MODERN_HANS: Record<TenGod, string> = {
  비견: "独立心与自主性",
  겁재: "竞争心与强大的执行力",
  식신: "专业能力与稳定的产出力",
  상관: "创意表达力与个人品牌天赋",
  편재: "项目型的创收能力与投资敏感度",
  정재: "稳健的资产管理与踏实的累积",
  편관: "危机应变力与突破型领导力",
  정관: "原则感、责任感与组织适应力",
  편인: "专业企划力与与众不同的直觉",
  정인: "学习力、包容力与赢得信任的力量",
};

export const LUCKY_BY_ELEMENT_HANS: Record<Element, { colors: string; numbers: string; direction: string; habits: string }> = {
  wood: { colors: "绿色・青绿色", numbers: "3, 8", direction: "东方", habits: "晨间散步、照顾植物、开始新的学习" },
  fire: { colors: "红色・橘色・紫色", numbers: "2, 7", direction: "南方", habits: "多晒太阳、与人交流、发表与表达" },
  earth: { colors: "黄色・土黄・米色", numbers: "5, 10", direction: "中央（住家・办公室中心）", habits: "规律用餐、整理行程、养成储蓄习惯" },
  metal: { colors: "白色・银色・金色", numbers: "4, 9", direction: "西方", habits: "整理收纳、呼吸运动、建立原则" },
  water: { colors: "黑色・深蓝", numbers: "1, 6", direction: "北方", habits: "充足睡眠、阅读与冥想、多喝水" },
};

export const ZODIAC_HANS: Record<string, string> = {
  쥐: "鼠", 소: "牛", 호랑이: "虎", 토끼: "兔", 용: "龙", 뱀: "蛇",
  말: "马", 양: "羊", 원숭이: "猴", 닭: "鸡", 개: "狗", 돼지: "猪",
};

const STRENGTH_HANS: Record<string, string> = { 극신약: "极身弱", 신약: "身弱", 중화: "中和", 신강: "身强", 극신강: "极身强" };

/** 영어 표기. 십신은 영어권 명리서에서 흔히 쓰는 이름. */
export const TEN_GOD_EN: Record<TenGod, string> = {
  비견: "Friend", 겁재: "Rob Wealth", 식신: "Eating God", 상관: "Hurting Officer", 편재: "Indirect Wealth",
  정재: "Direct Wealth", 편관: "Seven Killings", 정관: "Direct Officer", 편인: "Indirect Resource", 정인: "Direct Resource",
};

export const ELEMENT_EN: Record<Element, string> = { wood: "Wood", fire: "Fire", earth: "Earth", metal: "Metal", water: "Water" };

export const TEN_GOD_MODERN_EN: Record<TenGod, string> = {
  비견: "Independence and self-direction",
  겁재: "Competitive drive and strong momentum",
  식신: "Expertise and steady productivity",
  상관: "Creative expression and a gift for personal branding",
  편재: "Project-based earning power and an eye for investment",
  정재: "Steady asset management and diligent saving",
  편관: "Crisis response and breakthrough leadership",
  정관: "Principles, responsibility and fitting into organisations",
  편인: "Specialist planning and unusual intuition",
  정인: "Learning, receptiveness and the ability to earn trust",
};

export const LUCKY_BY_ELEMENT_EN: Record<Element, { colors: string; numbers: string; direction: string; habits: string }> = {
  wood: { colors: "Green, teal", numbers: "3, 8", direction: "East", habits: "Morning walks, tending plants, starting something new to learn" },
  fire: { colors: "Red, orange, purple", numbers: "2, 7", direction: "South", habits: "Getting sunlight, meeting people, presenting and expressing yourself" },
  earth: { colors: "Yellow, ochre, beige", numbers: "5, 10", direction: "Centre (the middle of your home or office)", habits: "Regular meals, organising your schedule, a saving habit" },
  metal: { colors: "White, silver, gold", numbers: "4, 9", direction: "West", habits: "Tidying up, breathing exercises, setting clear rules for yourself" },
  water: { colors: "Black, navy", numbers: "1, 6", direction: "North", habits: "Enough sleep, reading and meditation, drinking water often" },
};

export const ZODIAC_EN: Record<string, string> = {
  쥐: "Rat", 소: "Ox", 호랑이: "Tiger", 토끼: "Rabbit", 용: "Dragon", 뱀: "Snake",
  말: "Horse", 양: "Goat", 원숭이: "Monkey", 닭: "Rooster", 개: "Dog", 돼지: "Pig",
};

const STRENGTH_EN: Record<string, string> = { 극신약: "Very weak", 신약: "Weak", 중화: "Balanced", 신강: "Strong", 극신강: "Very strong" };

/** 한국어가 아닌 언어의 표기 표(번체·간체·영어). */
export function foreignTables(locale: ForeignLocale) {
  if (locale === "en") return { tenGod: TEN_GOD_EN, modern: TEN_GOD_MODERN_EN, lucky: LUCKY_BY_ELEMENT_EN, zodiac: ZODIAC_EN, strength: STRENGTH_EN };
  return locale === "zh-Hans"
    ? { tenGod: TEN_GOD_HANS, modern: TEN_GOD_MODERN_HANS, lucky: LUCKY_BY_ELEMENT_HANS, zodiac: ZODIAC_HANS, strength: STRENGTH_HANS }
    : { tenGod: TEN_GOD_ZH, modern: TEN_GOD_MODERN_ZH, lucky: LUCKY_BY_ELEMENT_ZH, zodiac: ZODIAC_ZH, strength: STRENGTH_ZH };
}

/** 중국어 표기 표(번체·간체). */
export const zhTables = (locale: ZhLocale) => foreignTables(locale);

const pad = (n: number) => String(n).padStart(2, "0");

/** 엔진이 만드는 문장. 언어별로 같은 모양의 함수를 둔다. */
export interface EngineText {
  yearRange: string;
  badSolarDate: string;
  noLeapMonth: (year: number, month: number) => string;
  badLunarDate: string;
  badHour: string;
  badMinute: string;
  futureDate: string;
  offsetNote: (region: Region, offsetMinutes: number) => string | null;
  timeNoteCorrected: (f: { y: number; m: number; d: number; h: number; mi: number }, longitude: number) => string;
  timeNoteClock: (offsetMinutes: number, h: number, mi: number) => string;
  noHour: string;
  jieBoundary: string;
  lunarLibrary: (region: Region) => string;
  lunarDate: (y: number, m: number, d: number, leap: boolean) => string;
  zodiac: (koAnimal: string) => string;
  strength: (koLabel: string) => string;
  gyeokgukBasis: (monthBranch: string, base: string, revealed: boolean) => string;
  usefulnessMethod: (kind: "weak" | "strong" | "balanced") => string;
  rarityLabel: (dayGz: string, gyeokgukKo: string, yongsin: Element) => string;
  inputError: string;
}

const utcLabel = (minutes: number) => `UTC+${Math.floor(minutes / 60)}${minutes % 60 ? `:${pad(minutes % 60)}` : ""}`;

const KO: EngineText = {
  yearRange: "연도는 1900~2100 사이로 입력해 주세요.",
  badSolarDate: "존재하지 않는 양력 날짜입니다.",
  noLeapMonth: (y, m) => `${y}년 음력에는 윤${m}월이 없습니다.`,
  badLunarDate: "존재하지 않는 음력 날짜입니다.",
  badHour: "시각은 0~23시로 입력해 주세요.",
  badMinute: "분은 0~59로 입력해 주세요.",
  futureDate: "생년월일이 오늘 이후입니다. 날짜를 다시 확인해 주세요.",
  offsetNote: (region, offset) => {
    if (region === "KR") {
      if (offset === 510) return "1954~1961년 표준시(UTC+8:30)를 반영했습니다.";
      if (offset === 600) return "1987~1988년 서머타임(1시간)을 반영했습니다.";
      return null;
    }
    return offset === REGION_INFO[region].standardOffset ? null : `출생 당시 현지 시간(${utcLabel(offset)})을 반영했습니다.`;
  },
  timeNoteCorrected: (f, lon) => `진태양시 보정 적용: ${f.y}-${pad(f.m)}-${pad(f.d)} ${pad(f.h)}:${pad(f.mi)} (동경 ${lon}° 기준)`,
  timeNoteClock: (offset, h, mi) => `표준시(${utcLabel(offset)}) 기준: ${pad(h)}:${pad(mi)}`,
  noHour: "태어난 시각을 몰라 시주 없이 6글자로 분석했습니다.",
  jieBoundary: "절기가 바뀌는 날 전후라 태어난 시각에 따라 월주(또는 년주)가 달라질 수 있습니다.",
  lunarLibrary: () => "음력 변환은 중국 음력 기준 라이브러리를 사용합니다. 드물게 한국 음력과 하루 차이 날 수 있습니다.",
  lunarDate: (y, m, d, leap) => `${y}년 ${leap ? "윤" : ""}${m}월 ${d}일`,
  zodiac: (a) => a,
  strength: (l) => l,
  gyeokgukBasis: (mb, base, revealed) => (revealed ? `월지 ${mb}의 지장간 ${base}이(가) 천간에 드러남` : `월지 ${mb}의 정기 ${base} 기준`),
  usefulnessMethod: (kind) =>
    `억부·균형 기준: ${
      kind === "weak"
        ? "신약하여 일간을 돕는 오행(인성·비겁) 중 부족한 쪽"
        : kind === "strong"
          ? "신강하여 힘을 빼 주는 오행(식상·재성·관성) 중 부족한 쪽"
          : "중화에 가까워 원국에서 가장 부족한 오행"
    }`,
  rarityLabel: (gz, gk, y) => `${gz}일주 · ${gk} · 용신 ${({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수" } as const)[y]}`,
  inputError: "입력값을 확인해 주세요.",
};

const ZH: EngineText = {
  yearRange: "年份請輸入 1900～2100 之間。",
  badSolarDate: "這個國曆日期不存在。",
  noLeapMonth: (y, m) => `${y} 年農曆沒有閏${m}月。`,
  badLunarDate: "這個農曆日期不存在。",
  badHour: "時間請輸入 0～23 時。",
  badMinute: "分鐘請輸入 0～59。",
  futureDate: "出生日期晚於今天，請重新確認日期。",
  offsetNote: (region, offset) => {
    const std = REGION_INFO[region].standardOffset;
    if (offset === std) return null;
    if (region === "KR") return `已套用出生當時的韓國標準時間（${utcLabel(offset)}）。`;
    return offset === std + 60
      ? `已扣除出生當時的夏令時間（日光節約時間）1 小時（${utcLabel(offset)}）。`
      : `已套用出生當時的當地時間（${utcLabel(offset)}）。`;
  },
  timeNoteCorrected: (f, lon) => `已套用真太陽時校正：${f.y}-${pad(f.m)}-${pad(f.d)} ${pad(f.h)}:${pad(f.mi)}（以東經 ${lon}° 計算）`,
  timeNoteClock: (offset, h, mi) => `以標準時間（${utcLabel(offset)}）計算：${pad(h)}:${pad(mi)}`,
  noHour: "未提供出生時間，以不含時柱的六字進行分析。",
  jieBoundary: "出生日接近節氣交接，依出生時間不同，月柱（或年柱）可能會改變。",
  lunarLibrary: (region) =>
    region === "KR"
      ? "農曆換算採用中國農曆曆法，極少數情況下可能與韓國農曆相差一天。"
      : region === "CN"
        ? "農曆換算採用中國通行的農曆曆法。"
        : "農曆換算採用中國農曆曆法（與台灣、香港通行的農曆相同）。",
  lunarDate: (y, m, d, leap) => `${y}年${leap ? "閏" : ""}${m}月${d}日`,
  zodiac: (a) => ZODIAC_ZH[a] ?? a,
  strength: (l) => STRENGTH_ZH[l] ?? l,
  gyeokgukBasis: (mb, base, revealed) => (revealed ? `月支 ${mb} 的藏干 ${base} 透出天干` : `以月支 ${mb} 的本氣 ${base} 為準`),
  usefulnessMethod: (kind) =>
    `扶抑・平衡法：${
      kind === "weak"
        ? "身弱，取生扶日主的五行（印星・比劫）中較不足者"
        : kind === "strong"
          ? "身強，取洩耗日主的五行（食傷・財星・官殺）中較不足者"
          : "接近中和，取命局中最不足的五行"
    }`,
  rarityLabel: (gz, gk, y) => `${gz}日柱・${gyeokgukLabel(gk, "zh-Hant")}・用神${ELEMENT_ZH[y]}`,
  inputError: "請確認輸入內容。",
};

const ZH_HANS: EngineText = {
  yearRange: "年份请输入 1900～2100 之间。",
  badSolarDate: "这个公历日期不存在。",
  noLeapMonth: (y, m) => `${y} 年农历没有闰${m}月。`,
  badLunarDate: "这个农历日期不存在。",
  badHour: "时间请输入 0～23 时。",
  badMinute: "分钟请输入 0～59。",
  futureDate: "出生日期晚于今天，请重新确认日期。",
  offsetNote: (region, offset) => {
    const std = REGION_INFO[region].standardOffset;
    if (offset === std) return null;
    if (region === "KR") return `已按出生时的韩国标准时间计算（${utcLabel(offset)}）。`;
    return offset === std + 60
      ? `已扣除出生时实行的夏令时 1 小时（${utcLabel(offset)}）。`
      : `已按出生时的当地时间计算（${utcLabel(offset)}）。`;
  },
  timeNoteCorrected: (f, lon) => `已进行真太阳时校正：${f.y}-${pad(f.m)}-${pad(f.d)} ${pad(f.h)}:${pad(f.mi)}（以东经 ${lon}° 计算）`,
  timeNoteClock: (offset, h, mi) => `以标准时间（${utcLabel(offset)}）计算：${pad(h)}:${pad(mi)}`,
  noHour: "未提供出生时间，以不含时柱的六字进行分析。",
  jieBoundary: "出生日接近节气交接，依出生时间不同，月柱（或年柱）可能会改变。",
  lunarLibrary: (region) =>
    region === "KR" ? "农历换算采用中国农历历法，极少数情况下可能与韩国农历相差一天。" : "农历换算采用中国通行的农历历法。",
  lunarDate: (y, m, d, leap) => `${y}年${leap ? "闰" : ""}${m}月${d}日`,
  zodiac: (a) => ZODIAC_HANS[a] ?? a,
  strength: (l) => STRENGTH_HANS[l] ?? l,
  gyeokgukBasis: (mb, base, revealed) => (revealed ? `月支 ${mb} 的藏干 ${base} 透出天干` : `以月支 ${mb} 的本气 ${base} 为准`),
  usefulnessMethod: (kind) =>
    `扶抑・平衡法：${
      kind === "weak"
        ? "身弱，取生扶日主的五行（印星・比劫）中较不足者"
        : kind === "strong"
          ? "身强，取泄耗日主的五行（食伤・财星・官杀）中较不足者"
          : "接近中和，取命局中最不足的五行"
    }`,
  rarityLabel: (gz, gk, y) => `${gz}日柱・${gyeokgukLabel(gk, "zh-Hans")}・用神${ELEMENT_ZH[y]}`,
  inputError: "请确认输入内容。",
};

const REGION_EN: Record<Region, string> = { KR: "Korea", TW: "Taiwan", HK: "Hong Kong", CN: "mainland China" };

const EN: EngineText = {
  yearRange: "Please enter a year between 1900 and 2100.",
  badSolarDate: "That date does not exist in the solar calendar.",
  noLeapMonth: (y, m) => `The lunar year ${y} has no leap month ${m}.`,
  badLunarDate: "That date does not exist in the lunar calendar.",
  badHour: "Please enter an hour between 0 and 23.",
  badMinute: "Please enter minutes between 0 and 59.",
  futureDate: "The date of birth is after today. Please check the date.",
  offsetNote: (region, offset) => {
    const std = REGION_INFO[region].standardOffset;
    if (offset === std) return null;
    return offset === std + 60
      ? `Daylight saving time in force at birth was taken into account (${utcLabel(offset)}).`
      : `The local standard time in force at birth in ${REGION_EN[region]} was used (${utcLabel(offset)}).`;
  },
  timeNoteCorrected: (f, lon) => `True solar time applied: ${f.y}-${pad(f.m)}-${pad(f.d)} ${pad(f.h)}:${pad(f.mi)} (longitude ${lon}° E)`,
  timeNoteClock: (offset, h, mi) => `Standard time (${utcLabel(offset)}): ${pad(h)}:${pad(mi)}`,
  noHour: "The birth time is unknown, so the chart was read from six characters without the hour pillar.",
  jieBoundary: "The birth date is close to a solar-term change, so the month (or year) pillar may differ depending on the exact birth time.",
  lunarLibrary: (region) =>
    region === "KR"
      ? "Lunar dates are converted with the Chinese lunar calendar; rarely, the Korean lunar calendar differs by one day."
      : "Lunar dates are converted with the Chinese lunar calendar.",
  lunarDate: (y, m, d, leap) => `${y}, ${leap ? "leap " : ""}month ${m}, day ${d}`,
  zodiac: (a) => ZODIAC_EN[a] ?? a,
  strength: (l) => STRENGTH_EN[l] ?? l,
  gyeokgukBasis: (mb, base, revealed) =>
    revealed ? `The hidden stem ${base} of the month branch ${mb} appears among the heavenly stems` : `Based on ${base}, the main qi of the month branch ${mb}`,
  usefulnessMethod: (kind) =>
    `Support-and-restrain and balance method: ${
      kind === "weak"
        ? "the Day Master is weak, so the scarcer of the elements that support it (Resource, Friend)"
        : kind === "strong"
          ? "the Day Master is strong, so the scarcer of the elements that drain it (Output, Wealth, Officer)"
          : "the chart is close to balanced, so the element it lacks most"
    }`,
  rarityLabel: (gz, gk, y) => `${gz} day pillar · ${gyeokgukLabel(gk, "en")} · useful element ${ELEMENT_EN[y]}`,
  inputError: "Please check what you entered.",
};

export const engineText = (locale: Locale = "ko"): EngineText =>
  locale === "zh-Hant" ? ZH : locale === "zh-Hans" ? ZH_HANS : locale === "en" ? EN : KO;

/**
 * 지역 시간대의 그 시각 UTC 오프셋(분). 시간대 데이터(tzdata)의 과거 서머타임·표준시 변경을 따른다.
 * 현지 벽시계 시각 → UTC 순간을 찾으려면 두 번 맞춰 본다.
 */
export function tzOffsetMinutes(timeZone: string, y: number, m: number, d: number, h: number, mi: number): number {
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let offset = offsetAt(timeZone, wall - 480 * 60_000);
  offset = offsetAt(timeZone, wall - offset * 60_000);
  return offset;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function offsetAt(timeZone: string, utcMs: number): number {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
    formatters.set(timeZone, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const local = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute));
  return Math.round((local - Math.floor(utcMs / 60_000) * 60_000) / 60_000);
}
