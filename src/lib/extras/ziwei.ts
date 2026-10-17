// 자미두수 명반(서버 전용): iztro로 열두 궁에 별을 배치하고(별 이름은 한국어, 간지·밝기는 한자 표기에서), 대한·유년을 함께 본다.
import { astro } from "iztro";
import type { SajuChart } from "../saju/calc";
import { COMMON_RULES, sectionsJsonSchema, writeJson } from "./ai";
import { sectionsTextSchema } from "./text";
import type { ExtraResult, SectionsText } from "./kinds";

const BRIGHT: Record<string, string> = { 廟: "묘", 旺: "왕", 得: "득", 利: "리", 平: "평", 不: "불", 陷: "함" };
const MUTAGEN: Record<string, string> = { 祿: "화록", 權: "화권", 科: "화과", 忌: "화기" };

export class ZiweiError extends Error {}

export interface ZiweiStar {
  name: string;
  hanja: string;
  bright: string | null;
  mutagen: string | null;
}

export interface ZiweiPalace {
  name: string;
  stem: string;
  branch: string;
  body: boolean;
  major: ZiweiStar[];
  minor: ZiweiStar[];
  adjective: string[];
  decadal: [number, number];
  changsheng: string;
}

export interface ZiweiComputed {
  solar: string;
  timeLabel: string;
  soul: string;
  body: string;
  fiveClass: string;
  palaces: ZiweiPalace[];
  natalMutagens: { star: string; mutagen: string; palace: string }[];
  year: number;
  nominalAge: number;
  decadal: { palace: string; range: [number, number]; mutagens: string[] } | null;
  yearly: { palace: string; ganzhi: string; mutagens: string[] };
}

/** 시각(0~23시) → iztro 시진 번호(0 이른 자시, 1 축시 … 11 해시, 12 늦은 자시) */
export const timeIndex = (h: number) => (h === 23 ? 12 : Math.floor((h + 1) / 2));

const STAR = (zh: { name: string; brightness?: string; mutagen?: string }, ko: { name: string }): ZiweiStar => ({
  name: ko.name,
  hanja: zh.name,
  bright: zh.brightness ? (BRIGHT[zh.brightness] ?? zh.brightness) : null,
  mutagen: zh.mutagen ? (MUTAGEN[zh.mutagen] ?? zh.mutagen) : null,
});

export function computeZiwei(chart: SajuChart, now = new Date()): ZiweiComputed {
  const t = chart.localTime;
  if (!t) throw new ZiweiError("자미두수 명반은 태어난 시각이 있어야 세울 수 있습니다.");
  const date = `${t.y}-${t.m}-${t.d}`;
  const idx = timeIndex(t.h);
  const g = chart.input.gender === "male" ? "男" : "女";
  // 언어 설정이 라이브러리 전역이라, 한자판을 먼저 만들고 바로 필요한 값을 다 뽑은 뒤 한국어판을 만든다.
  const zh = astro.bySolar(date, idx, g, true, "zh-TW");
  const zhHoro = zh.horoscope(now);
  const ko = astro.bySolar(date, idx, g, true, "ko-KR");
  const koHoro = ko.horoscope(now);
  const palaces: ZiweiPalace[] = zh.palaces.map((p, i) => {
    const k = ko.palaces[i];
    return {
      name: k.name === "명궁" ? "명궁" : `${k.name}궁`,
      stem: p.heavenlyStem,
      branch: p.earthlyBranch,
      body: p.isBodyPalace,
      major: p.majorStars.map((s, j) => STAR(s, k.majorStars[j])),
      minor: p.minorStars.map((s, j) => STAR(s, k.minorStars[j])),
      adjective: k.adjectiveStars.map((s) => s.name),
      decadal: [p.decadal.range[0], p.decadal.range[1]],
      changsheng: k.changsheng12,
    };
  });
  const natalMutagens = palaces.flatMap((p) => [...p.major, ...p.minor].filter((s) => s.mutagen).map((s) => ({ star: s.name, mutagen: s.mutagen!, palace: p.name })));
  const yearlyIdx = zhHoro.yearly.index;
  const decIdx = zhHoro.decadal.index;
  const decadalInRange = decIdx >= 0 && palaces[decIdx] && zhHoro.age.nominalAge >= palaces[decIdx].decadal[0];
  return {
    solar: chart.solarDate,
    timeLabel: `${String(t.h).padStart(2, "0")}:${String(t.mi).padStart(2, "0")} (${zh.time})`,
    soul: ko.soul,
    body: ko.body,
    fiveClass: ko.fiveElementsClass,
    palaces,
    natalMutagens,
    year: new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear(),
    nominalAge: zhHoro.age.nominalAge,
    decadal: decadalInRange ? { palace: palaces[decIdx].name, range: palaces[decIdx].decadal, mutagens: koHoro.decadal.mutagen } : null,
    yearly: { palace: palaces[yearlyIdx].name, ganzhi: zhHoro.yearly.heavenlyStem + zhHoro.yearly.earthlyBranch, mutagens: koHoro.yearly.mutagen },
  };
}

const MUT_ORDER = ["화록", "화권", "화과", "화기"];
const starText = (s: ZiweiStar) => `${s.name}${s.bright ? `(${s.bright})` : ""}${s.mutagen ? `[${s.mutagen}]` : ""}`;

export function ziweiPrompt(c: ZiweiComputed) {
  return {
    명주: c.soul,
    신주: c.body,
    오행국: c.fiveClass,
    열두궁: c.palaces.map((p) => `${p.name}${p.body ? "(신궁)" : ""} ${p.stem}${p.branch}: 주성 ${p.major.map(starText).join(", ") || "없음(공궁)"} / 보좌·살성 ${p.minor.map(starText).join(", ") || "-"} / 대한 ${p.decadal[0]}~${p.decadal[1]}세`),
    생년사화: c.natalMutagens.map((m) => `${m.star} ${m.mutagen} → ${m.palace}`),
    현재: `${c.year}년, 세는나이 ${c.nominalAge}세`,
    대한: c.decadal ? `${c.decadal.palace} 대한(${c.decadal.range[0]}~${c.decadal.range[1]}세), 대한 사화 ${c.decadal.mutagens.map((s, i) => `${s} ${MUT_ORDER[i]}`).join(", ")}` : "첫 대한 전",
    유년: `${c.yearly.ganzhi}년 유년 명궁 ${c.yearly.palace}, 유년 사화 ${c.yearly.mutagens.map((s, i) => `${s} ${MUT_ORDER[i]}`).join(", ")}`,
  };
}

const SYSTEM = `당신은 자미두수(紫微斗數)에 깊이 밝은 품격 있는 감정가입니다. 유료 감정서 "자미두수 명반"의 문장을 씁니다.
열두 궁에 놓인 주성·보좌성·살성과 밝기(묘·왕·득·리·평·불·함), 생년사화, 대한·유년을 근거로 풀이합니다. 별이 없는 궁(공궁)은 맞은편 궁(대궁)의 별을 빌려 보는 전통을 따를 수 있습니다.
질액궁은 생활 리듬과 몸을 돌보는 습관 이야기로만 쓰고 질병을 말하지 않습니다.
${COMMON_RULES}`;

export type ZiweiResult = ExtraResult<Record<string, never>, ZiweiComputed, SectionsText>;

export async function generateZiwei(chart: SajuChart, paidAt: Date): Promise<ZiweiResult> {
  const computed = computeZiwei(chart, paidAt);
  const user = `"자미두수 명반" 감정서를 씁니다.
- summary: 명반 전체를 한 줄로.
- sections: 7개 장, 장마다 2~3개 문단(장당 400~700자). 순서와 제목:
  1) "명반의 바탕" — 명주·신주·오행국, 명궁과 신궁의 자리
  2) "명궁: 타고난 성향" — 명궁의 주성과 밝기, 삼방사정(재백·관록·천이)과 함께
  3) "재백궁과 관록궁: 재물과 일"
  4) "부처궁·자녀궁·형제궁·부모궁: 가까운 인연"
  5) "천이궁·노복궁·전택궁·복덕궁: 바깥 활동과 마음의 쉼터" (질액궁은 생활 습관 이야기로만 짧게)
  6) "생년사화: 평생 따라오는 네 기운" — 화록·화권·화과·화기가 들어간 궁
  7) "지금의 대한과 올해" — 대한 궁과 대한 사화, 올해 유년
- advice: 명반에 맞춘 실천 조언 4~5개.

[명반 JSON]
${JSON.stringify(ziweiPrompt(computed), null, 2)}`;
  const text = await writeJson({ system: SYSTEM, user, schema: sectionsJsonSchema("명반 풀이의 장", "7개"), zod: sectionsTextSchema, label: "자미두수 명반" });
  return { kind: "ziwei", request: {}, computed, text };
}
