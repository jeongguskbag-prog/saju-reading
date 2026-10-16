// 홍콩(번체 중국어) 화면 문구. 대만판(zh-TW)을 바탕으로 홍콩에서 쓰는 말로 바꾼다.
// 國曆(대만식 양력) → 西曆, 電子郵件 → 電郵, 列印 → 打印, 기본 출생지 홍콩.
import type { Messages } from "./ko";
import { zhTW } from "./zh-TW";

/** 문자열 안의 대만식 단어를 홍콩식으로 바꾼다. 함수는 결과 문자열에 적용한다. */
function toHK<T>(v: T): T {
  if (typeof v === "string") {
    return v
      .replace(/國曆/g, "西曆")
      .replace(/電子郵件/g, "電郵")
      .replace(/列印/g, "打印")
      .replace(/台灣・香港・韓國/g, "香港・台灣・韓國")
      .replace(/台北約 \+6 分、香港約 -23 分/g, "香港約 -23 分、台北約 +6 分") as T;
  }
  if (typeof v === "function") {
    const f = v as unknown as (...a: unknown[]) => unknown;
    return ((...a: unknown[]) => toHK(f(...a))) as T;
  }
  if (Array.isArray(v)) return v.map(toHK) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toHK(x)])) as T;
  return v;
}

const base = toHK(zhTW);

export const zhHK: Messages = {
  ...base,
  numberLocale: "zh-HK",
  landing: {
    ...base.landing,
    faq: base.landing.faq.map((f) =>
      f.q === "在台灣以外出生也可以嗎？"
        ? { q: "在香港以外出生也可以嗎？", a: "可以。請在「計算選項」中選擇出生地（香港・台灣・韓國），系統會依當地的時區與夏令時間計算。" }
        : f,
    ),
  },
  meta: {
    title: base.meta.title,
    description: "以精確到分鐘的節氣萬年曆排出八字，告訴您在五個等級中的位置與百年大運走勢。依香港時區與夏令時間計算，可免費查看。",
  },
};
