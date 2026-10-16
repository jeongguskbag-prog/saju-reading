// 화면 문구 사전. getMessages(locale)로 꺼내 쓴다.
import { ko, type Messages } from "./ko";
import { zhTW } from "./zh-TW";
import { zhHK } from "./zh-HK";
import type { Locale } from "./locales";

export type { Messages } from "./ko";
export * from "./locales";

const ALL: Record<Locale, Messages> = { ko, "zh-TW": zhTW, "zh-HK": zhHK };

export const getMessages = (locale: Locale = "ko"): Messages => ALL[locale] ?? ko;
