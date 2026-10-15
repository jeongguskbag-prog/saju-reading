// 언어(ko, zh-Hant)와 출생 지역(KR, TW, HK). 엔진 내부 값(십신·격국 이름 등)은 한국어 키를 그대로 쓰고,
// 화면과 감정서에 나가는 문장만 언어별로 만든다.
import type { Element, TenGod } from "./constants";

export type Locale = "ko" | "zh-Hant";
export type Region = "KR" | "TW" | "HK";

export const LOCALES: Locale[] = ["ko", "zh-Hant"];
export const REGIONS: Region[] = ["KR", "TW", "HK"];

export const REGION_INFO: Record<Region, { timeZone: string; standardOffset: number; longitude: number }> = {
  KR: { timeZone: "Asia/Seoul", standardOffset: 540, longitude: 126.98 },
  TW: { timeZone: "Asia/Taipei", standardOffset: 480, longitude: 121.56 },
  HK: { timeZone: "Asia/Hong_Kong", standardOffset: 480, longitude: 114.17 },
};

/** 십신의 번체 표기. 편관은 대만·홍콩에서 흔히 쓰는 七殺로 적는다. */
export const TEN_GOD_ZH: Record<TenGod, string> = {
  비견: "比肩", 겁재: "劫財", 식신: "食神", 상관: "傷官", 편재: "偏財",
  정재: "正財", 편관: "七殺", 정관: "正官", 편인: "偏印", 정인: "正印",
};

export const ELEMENT_ZH: Record<Element, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };

export const tenGodName = (g: TenGod, locale: Locale) => (locale === "zh-Hant" ? TEN_GOD_ZH[g] : g);

/** 격국 이름(내부 키는 한국어 "정관격", "건록격" 등)을 언어에 맞게. */
export function gyeokgukLabel(name: string, locale: Locale): string {
  if (locale === "ko") return name;
  if (name === "건록격") return "建祿格";
  if (name === "양인격") return "羊刃格";
  const god = name.replace(/격$/, "") as TenGod;
  return `${TEN_GOD_ZH[god] ?? god}格`;
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
    region === "KR" ? "農曆換算採用中國農曆曆法，極少數情況下可能與韓國農曆相差一天。" : "農曆換算採用中國農曆曆法（與台灣、香港通行的農曆相同）。",
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

export const engineText = (locale: Locale = "ko"): EngineText => (locale === "zh-Hant" ? ZH : KO);

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
