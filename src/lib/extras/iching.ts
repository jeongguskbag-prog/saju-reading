// 주역 점: 시초점(대연지수)의 확률로 여섯 효를 얻고, 주희 『역학계몽』의 변효 읽는 법으로 읽을 글을 정한다(서버 전용).
import { randomInt } from "node:crypto";
import zhouyi from "../../../data/iching/zhouyi.json";
import type { SajuChart } from "../saju/calc";
import { ELEMENT_KO } from "../saju/constants";
import { COMMON_RULES, sectionsJsonSchema, writeJson } from "./ai";
import { sectionsTextSchema } from "./text";
import type { ExtraResult, SectionsText } from "./kinds";
import { ICHING_TOPICS, type IchingRequest } from "./requests";

interface RawHex {
  n: number;
  name: string;
  ko: string;
  bits: string;
  symbol: string;
  judgment: string;
  image: string;
  lines: string[];
  use?: string;
}
const HEX = zhouyi as RawHex[];
const BY_BITS = new Map(HEX.map((h) => [h.bits, h]));

const TRIGRAM: Record<string, { name: string; nature: string; ko: string }> = {
  "111": { name: "乾", nature: "天", ko: "하늘" },
  "000": { name: "坤", nature: "地", ko: "땅" },
  "100": { name: "震", nature: "雷", ko: "우레" },
  "011": { name: "巽", nature: "風", ko: "바람" },
  "010": { name: "坎", nature: "水", ko: "물" },
  "101": { name: "離", nature: "火", ko: "불" },
  "001": { name: "艮", nature: "山", ko: "산" },
  "110": { name: "兌", nature: "澤", ko: "못" },
};

export type LineValue = 6 | 7 | 8 | 9;

/** 시초점 확률: 노음(6) 1/16, 소양(7) 5/16, 소음(8) 7/16, 노양(9) 3/16 */
export function castLine(r16: number): LineValue {
  if (r16 < 1) return 6;
  if (r16 < 6) return 7;
  if (r16 < 13) return 8;
  return 9;
}

export function castHexagram(rand: () => number = () => randomInt(16)): LineValue[] {
  return Array.from({ length: 6 }, () => castLine(rand()));
}

export interface Hexagram {
  n: number;
  name: string;
  ko: string;
  full: string;
  symbol: string;
  bits: string;
  upper: string;
  lower: string;
  judgment: string;
  image: string;
  lines: string[];
  use?: string;
}

function hexagram(bits: string): Hexagram {
  const h = BY_BITS.get(bits)!;
  const lo = TRIGRAM[bits.slice(0, 3)];
  const up = TRIGRAM[bits.slice(3)];
  const full = lo.name === up.name ? `${h.name}爲${up.nature}` : `${up.nature}${lo.nature}${h.name}`;
  return { ...h, full, upper: `${up.name}(${up.ko})`, lower: `${lo.name}(${lo.ko})` };
}

export interface IchingComputed {
  topic: IchingRequest["topic"];
  question: string;
  values: LineValue[];
  primary: Hexagram;
  changed: Hexagram | null;
  moving: number[];
  rule: string;
  /** 읽을 글(주로 볼 것이 맨 앞) */
  focus: { source: string; text: string }[];
}

const POS = ["초효", "2효", "3효", "4효", "5효", "상효"];

export function readHexagram(values: LineValue[], req: IchingRequest): IchingComputed {
  const bits = values.map((v) => (v === 7 || v === 9 ? "1" : "0")).join("");
  const moving = values.map((v, i) => (v === 6 || v === 9 ? i : -1)).filter((i) => i >= 0);
  const changedBits = values.map((v) => (v === 9 ? "0" : v === 6 ? "1" : v === 7 ? "1" : "0")).join("");
  const primary = hexagram(bits);
  const changed = moving.length ? hexagram(changedBits) : null;
  const still = [0, 1, 2, 3, 4, 5].filter((i) => !moving.includes(i));
  const P = (i: number) => ({ source: `본괘 ${primary.name} ${POS[i]}`, text: primary.lines[i] });
  const C = (i: number) => ({ source: `지괘 ${changed!.name} ${POS[i]}`, text: changed!.lines[i] });
  let rule: string;
  let focus: IchingComputed["focus"];
  switch (moving.length) {
    case 0:
      rule = "움직이는 효가 없으면 본괘의 괘사로 점칩니다.";
      focus = [{ source: `본괘 ${primary.name} 괘사`, text: primary.judgment }];
      break;
    case 1:
      rule = "한 효가 움직이면 본괘에서 그 효의 효사로 점칩니다.";
      focus = [P(moving[0])];
      break;
    case 2:
      rule = "두 효가 움직이면 본괘의 두 효사로 점치되, 위의 효를 위주로 봅니다.";
      focus = [P(moving[1]), P(moving[0])];
      break;
    case 3:
      rule = "세 효가 움직이면 본괘와 지괘의 괘사로 점치되, 본괘를 바탕(체)으로 지괘를 쓰임(용)으로 봅니다.";
      focus = [{ source: `본괘 ${primary.name} 괘사`, text: primary.judgment }, { source: `지괘 ${changed!.name} 괘사`, text: changed!.judgment }];
      break;
    case 4:
      rule = "네 효가 움직이면 지괘에서 움직이지 않은 두 효사로 점치되, 아래 효를 위주로 봅니다.";
      focus = [C(still[0]), C(still[1])];
      break;
    case 5:
      rule = "다섯 효가 움직이면 지괘에서 움직이지 않은 한 효의 효사로 점칩니다.";
      focus = [C(still[0])];
      break;
    default:
      if (primary.use) {
        rule = `여섯 효가 모두 움직이면 ${primary.name}괘는 ${primary.use.slice(0, 2)}로 점칩니다.`;
        focus = [{ source: `본괘 ${primary.name} ${primary.use.slice(0, 2)}`, text: primary.use }, { source: `지괘 ${changed!.name} 괘사`, text: changed!.judgment }];
      } else {
        rule = "여섯 효가 모두 움직이면 지괘의 괘사로 점칩니다.";
        focus = [{ source: `지괘 ${changed!.name} 괘사`, text: changed!.judgment }];
      }
  }
  return { topic: req.topic, question: req.question, values, primary, changed, moving, rule, focus };
}

const SYSTEM = `당신은 주역(周易)에 깊이 밝은 품격 있는 해석가입니다. 유료 감정서 "주역 점"의 문장을 씁니다.
의뢰인의 물음에 대해 시초점으로 얻은 괘와 변효를 근거로, 정해진 읽는 법(JSON의 '읽는법'과 '읽을글')에 따라 풀이합니다. 괘사·효사·대상은 JSON에 있는 원문만 인용하고, 원문을 고치거나 지어내지 않습니다. 원문을 인용하면 바로 뒤에 쉬운 우리말 풀이를 붙입니다.
점의 결과를 확정된 미래로 말하지 말고, 지금의 형세와 처신을 비추는 거울로 풀어 줍니다.
${COMMON_RULES}`;

export type IchingResult = ExtraResult<IchingRequest, IchingComputed, SectionsText>;

export function ichingPrompt(c: IchingComputed, chart: SajuChart) {
  const hx = (h: Hexagram) => ({ 괘: `${h.full} (제${h.n}괘 ${h.ko}괘) ${h.symbol}`, 상괘: h.upper, 하괘: h.lower, 괘사: h.judgment, 대상: h.image });
  return {
    물음: c.question,
    분야: ICHING_TOPICS[c.topic],
    효: c.values.map((v, i) => `${POS[i]} ${v} (${v === 9 ? "노양, 움직임" : v === 6 ? "노음, 움직임" : v === 7 ? "소양" : "소음"})`),
    본괘: hx(c.primary),
    지괘: c.changed ? hx(c.changed) : "없음(움직이는 효 없음)",
    움직인효: c.moving.map((i) => `${POS[i]}: ${c.primary.lines[i]}`),
    읽는법: c.rule,
    읽을글: c.focus.map((f) => `${f.source}: ${f.text}`),
    참고_의뢰인일간: `${chart.dayMaster.stem} ${ELEMENT_KO[chart.dayMaster.element]} (참고만, 점의 중심은 괘)`,
  };
}

export async function generateIching(chart: SajuChart, request: IchingRequest, cast = castHexagram): Promise<IchingResult> {
  const computed = readHexagram(cast(), request);
  const user = `"주역 점" 감정서를 씁니다.
- summary: 물음에 대한 괘의 답을 한 줄로(단정하지 말고 처신의 방향으로).
- sections: 5개 장, 장마다 2~3개 문단(장당 350~650자). 순서와 제목:
  1) "얻은 괘" — 본괘의 상·하괘 형상과 괘의 뜻${computed.changed ? ", 지괘로 가는 흐름" : ""}
  2) "괘가 답하는 말" — 읽는 법에 따라 '읽을글'을 원문 인용과 우리말 풀이로
  3) "지금의 형세" — 물음(${ICHING_TOPICS[request.topic]})에 비추어 본 지금 상황
  4) "나아갈 길" — 무엇을 하고 무엇을 삼갈지
  5) "때를 기다리는 법" — 서두를 것과 기다릴 것, 대상(大象)의 군자 처신
- advice: 물음에 대한 실천 조언 3~5개.

[점괘 JSON]
${JSON.stringify(ichingPrompt(computed, chart), null, 2)}`;
  const text = await writeJson({ system: SYSTEM, user, schema: sectionsJsonSchema("주역 점 풀이의 장", "5개"), zod: sectionsTextSchema, label: "주역 점" });
  return { kind: "iching", request, computed, text };
}
