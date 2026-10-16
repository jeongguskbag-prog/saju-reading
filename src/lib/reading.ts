import { timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { TEN_GOD_MODERN } from "./saju/analysis";
import { ELEMENT_KO } from "./saju/constants";
import { ELEMENT_ZH, TEN_GOD_HANS, TEN_GOD_MODERN_HANS, TEN_GOD_MODERN_ZH, TEN_GOD_ZH, type Locale } from "./saju/locale";
import type { LuckPillar, Pillar, SajuChart } from "./saju/calc";
import {
  chaptersFor,
  chapterSchema,
  introSchema,
  withYears,
  type ChapterKey,
  type PartKey,
  type PartResult,
} from "./report-shared";

export const DEFAULT_MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `당신은 정통 명리학에 밝고, 그 개념을 현대 심리학과 비즈니스·생활 언어로 풀어 설명하는 품격 있는 사주 감정가입니다. 유료 감정서(A4 책자)의 한 파트를 집필합니다.

원칙:
- 입력으로 받은 [명식 JSON]만 근거로 씁니다. JSON에 없는 간지·십신·대운·격국·용신을 지어내지 말고, 언급하는 값은 JSON과 일치해야 합니다. 격국과 참고 용신은 JSON의 값을 그대로 씁니다.
- 고전 용어를 나열하지 말고 현대적 표현으로 풀어 씁니다. 십신은 [십신 현대어] 표의 표현을 우선 쓰고, 필요하면 괄호로 원래 용어를 덧붙입니다. 예: "프로젝트형 수익 창출력(편재)".
- 우아하고 신뢰감 있는 경어체(~합니다)로 씁니다. 단정하기보다 '~한 경향이 있습니다'처럼 경향으로 표현합니다.
- 공포심을 주는 표현(흉살 때문에 망한다, 단명, 큰 사고, 이혼수 단정 등)을 쓰지 않습니다. 약점은 반드시 구체적인 행동 개운법(Action Plan)과 함께 제시합니다.
- 건강은 오행 균형에 따른 생활 습관 제안까지만 쓰고, 특정 질병을 예언하거나 진단하지 않습니다. 투자 종목·시점 같은 구체적 금융 조언은 하지 않습니다.
- 의뢰인의 구체적인 경험이나 사건을 지어내지 않습니다.
- 각 파트의 다른 파트와 내용이 겹치지 않도록, 지시된 소제목의 범위 안에서만 씁니다.`;

const SYSTEM_PROMPT_ZH = `你是一位精通正統子平八字命理，並能以現代心理學、商業與生活語言深入淺出解說的資深命理師。你正在為付費命書（A4 冊子）撰寫其中一個章節。讀者是台灣與香港的委託人。

原則：
- 全文使用繁體中文（台灣用語），不得出現簡體字、韓文或日文。
- 只以輸入的【命盤 JSON】為依據。不得杜撰 JSON 中沒有的干支、十神、大運、格局或用神；提及的數值必須與 JSON 一致。格局與參考用神直接沿用 JSON 的內容。
- 不要堆砌古典術語，改以現代語言說明。十神優先使用【十神現代語】表中的說法，必要時以括號附上原術語。例如：「專案型的創收能力（偏財）」。
- 語氣優雅、可信、溫和，使用「您」。避免斷言，以「傾向於……」等方式描述趨勢。
- 不使用引發恐懼的說法（因凶煞而破敗、短命、重大事故、斷言離婚等）。提到弱點時，必須同時提出具體可行的開運行動方案（Action Plan）。
- 健康僅依五行平衡提出生活習慣建議，不預言或診斷特定疾病。不提供具體投資標的或進出場時機等金融建議。
- 不杜撰委託人的具體經歷或事件。
- 為避免與其他章節重複，只在指定的小標題範圍內撰寫。`;

const SYSTEM_PROMPT_HANS = `你是一位精通正统子平八字命理，并能以现代心理学、商业与生活语言深入浅出解说的资深命理师。你正在为付费命书（A4 册子）撰写其中一个章节。读者是中国大陆的委托人。

原则：
- 全文使用简体中文（中国大陆通行用语），不得出现繁体字、韩文或日文。
- 只以输入的【命盘 JSON】为依据。不得杜撰 JSON 中没有的干支、十神、大运、格局或用神；提及的数值必须与 JSON 一致。格局与参考用神直接沿用 JSON 的内容。
- 不要堆砌古典术语，改以现代语言说明。十神优先使用【十神现代语】表中的说法，必要时以括号附上原术语。例如：「项目型的创收能力（偏财）」。
- 语气优雅、可信、温和，使用「您」。避免断言，以「倾向于……」等方式描述趋势。
- 不使用引发恐惧的说法（因凶煞而破败、短命、重大事故、断言离婚等）。提到弱点时，必须同时提出具体可行的开运行动方案（Action Plan）。
- 健康仅依五行平衡提出生活习惯建议，不预言或诊断特定疾病。不提供具体投资标的或进出场时机等金融建议。
- 不杜撰委托人的具体经历或事件。
- 为避免与其他章节重复，只在指定的小标题范围内撰写。`;

function pillarSummary(p: Pillar | null) {
  if (!p) return null;
  return {
    간지: `${p.stem}${p.branch}(${p.stemKo}${p.branchKo})`,
    천간: { 글자: p.stem, 오행: ELEMENT_KO[p.stemElement], 십신: p.stemTenGod ?? "일간(본인)" },
    지지: { 글자: p.branch, 오행: ELEMENT_KO[p.branchElement], 십신: p.branchTenGod },
    지장간: p.hiddenStems.map((h) => `${h.stem}(${h.tenGod})`).join(", "),
  };
}

const luck = (l: LuckPillar) => `${l.stem}${l.branch}(${l.ko}) 천간 ${l.stemTenGod} / 지지 ${l.branchTenGod}`;

/** AI에 넘길 명식 데이터. 이름 등 개인 식별 정보는 넣지 않는다. */
export function chartForPrompt(chart: SajuChart) {
  const { pillars, analysis: a } = chart;
  const u = a.usefulness;
  return {
    성별: chart.input.gender === "male" ? "남성" : "여성",
    출생연도: Number(chart.solarDate.slice(0, 4)),
    태어난시각: pillars.hour ? "앎" : "모름(시주 제외)",
    원국: {
      년주: pillarSummary(pillars.year),
      월주: pillarSummary(pillars.month),
      일주: pillarSummary(pillars.day),
      시주: pillarSummary(pillars.hour),
    },
    일간: `${chart.dayMaster.stem}(${chart.dayMaster.ko}) ${ELEMENT_KO[chart.dayMaster.element]} ${chart.dayMaster.polarity === "yang" ? "양" : "음"}`,
    오행개수: Object.fromEntries(Object.entries(chart.elements.counts).map(([k, v]) => [ELEMENT_KO[k as keyof typeof ELEMENT_KO], v])),
    십신분포: chart.tenGodCounts,
    신강신약: `${chart.strength.label} (${chart.strength.score}/100, 참고값)`,
    격국: `${a.gyeokguk.name} (${a.gyeokguk.basis})`,
    참고용신: `${ELEMENT_KO[u.yongsin]} / 희신 ${ELEMENT_KO[u.huisin]} / 기신 ${ELEMENT_KO[u.gisin]} (${u.method})`,
    대운: {
      방향: chart.daeun.forward ? "순행" : "역행",
      목록: chart.daeun.periods.map(
        (p, i) => `${p.startAge}세~ (${p.startYear}~${p.endYear}) ${luck(p)} · 용신 부합도 ${a.daeunScores[i]?.score ?? "-"}/100`,
      ),
      현재대운: chart.daeun.current ? luck(chart.daeun.current) : "대운 시작 전",
    },
    세운: a.yearScores.map((y) => `${y.year}년 ${y.ganzhi} · 용신 부합도 ${y.score}/100`),
    월별흐름: a.monthly.map(
      (m) => `${m.year}년 절입 ${m.startDate.slice(5)}~ ${m.stem}${m.branch} (${m.stemTenGod}/${m.branchTenGod}) ${m.mark}`,
    ),
    // 숫자 등급·하위 순위는 넘기지 않는다(감정서에 "4등급", "상위 81%" 같은 말이 나오지 않게). 상위권만 순위를 쓴다.
    사주유형: `${chart.grade.tier.type} — ${chart.grade.tier.name} (${chart.grade.topPercent <= 15 ? `상위 ${chart.grade.topPercent}%, ` : ""}점수 ${chart.grade.score}/100) · 대운 전성기 ${chart.grade.peak ? `${chart.grade.peak.startAge}~${chart.grade.peak.endAge}세` : "-"} · 귀인 ${chart.grade.nobles.filter((n) => n.has).map((n) => n.name).join(", ") || "없음"}`,
    개운요소: { 오행: ELEMENT_KO[a.lucky.element], 색상: a.lucky.colors, 숫자: a.lucky.numbers, 방위: a.lucky.direction, 습관: a.lucky.habits },
  };
}

/** 번체 감정서용 명식 데이터. 키와 값을 모두 번체로 바꿔 한국어가 풀이에 섞이지 않게 한다. */
export function chartForPromptZh(chart: SajuChart) {
  const { pillars, analysis: a } = chart;
  const u = a.usefulness;
  const g = (x: keyof typeof TEN_GOD_ZH) => TEN_GOD_ZH[x];
  const pillar = (p: Pillar | null) =>
    p && {
      干支: `${p.stem}${p.branch}`,
      天干: { 字: p.stem, 五行: ELEMENT_ZH[p.stemElement], 十神: p.stemTenGod ? g(p.stemTenGod) : "日主（本人）" },
      地支: { 字: p.branch, 五行: ELEMENT_ZH[p.branchElement], 十神: g(p.branchTenGod) },
      藏干: p.hiddenStems.map((h) => `${h.stem}(${g(h.tenGod)})`).join("、"),
    };
  const luckZh = (l: LuckPillar) => `${l.stem}${l.branch} 天干${g(l.stemTenGod)}／地支${g(l.branchTenGod)}`;
  const mark = { 좋음: "佳", 보통: "平", 주의: "留意" } as const;
  return {
    性別: chart.input.gender === "male" ? "男性（乾命）" : "女性（坤命）",
    出生年: Number(chart.solarDate.slice(0, 4)),
    出生時間: pillars.hour ? "已知" : "不詳（未排時柱）",
    命局: { 年柱: pillar(pillars.year), 月柱: pillar(pillars.month), 日柱: pillar(pillars.day), 時柱: pillar(pillars.hour) },
    日主: `${chart.dayMaster.stem} ${chart.dayMaster.polarity === "yang" ? "陽" : "陰"}${ELEMENT_ZH[chart.dayMaster.element]}`,
    五行字數: Object.fromEntries(Object.entries(chart.elements.counts).map(([k, v]) => [ELEMENT_ZH[k as keyof typeof ELEMENT_ZH], v])),
    十神分布: Object.fromEntries(Object.entries(chart.tenGodCounts).map(([k, v]) => [g(k as keyof typeof TEN_GOD_ZH), v])),
    身強身弱: `${chart.strength.label}（${chart.strength.score}/100，參考值）`,
    格局: `${a.gyeokguk.label}（${a.gyeokguk.basis}）`,
    參考用神: `${ELEMENT_ZH[u.yongsin]}／喜神 ${ELEMENT_ZH[u.huisin]}／忌神 ${ELEMENT_ZH[u.gisin]}（${u.method}）`,
    大運: {
      方向: chart.daeun.forward ? "順行" : "逆行",
      列表: chart.daeun.periods.map(
        (p, i) => `${p.startAge}歲起（${p.startYear}～${p.endYear}）${luckZh(p)}・用神契合度 ${a.daeunScores[i]?.score ?? "-"}/100`,
      ),
      目前大運: chart.daeun.current ? luckZh(chart.daeun.current) : "尚未起運",
    },
    流年: a.yearScores.map((y) => `${y.year}年 ${y.ganzhi}・用神契合度 ${y.score}/100`),
    流月: a.monthly.map((m) => `${m.year}年 交節 ${m.startDate.slice(5)}起 ${m.stem}${m.branch}（${g(m.stemTenGod)}／${g(m.branchTenGod)}）${mark[m.mark]}`),
    命格類型: `${chart.grade.tier.type}・${chart.grade.tier.name}（${chart.grade.topPercent <= 15 ? `前 ${chart.grade.topPercent}%，` : ""}${chart.grade.score}/100）・大運巔峰 ${chart.grade.peak ? `${chart.grade.peak.startAge}～${chart.grade.peak.endAge}歲` : "-"}・貴人 ${chart.grade.nobles.filter((n) => n.has).map((n) => (n.name === "천을귀인" ? "天乙貴人" : "文昌貴人")).join("、") || "無"}`,
    開運要素: { 五行: ELEMENT_ZH[a.lucky.element], 顏色: a.lucky.colors, 數字: a.lucky.numbers, 方位: a.lucky.direction, 習慣: a.lucky.habits },
  };
}

/** 간체 감정서용 명식 데이터. 키와 값을 모두 간체로 바꿔 한국어가 풀이에 섞이지 않게 한다. */
export function chartForPromptHans(chart: SajuChart) {
  const { pillars, analysis: a } = chart;
  const u = a.usefulness;
  const g = (x: keyof typeof TEN_GOD_HANS) => TEN_GOD_HANS[x];
  const pillar = (p: Pillar | null) =>
    p && {
      干支: `${p.stem}${p.branch}`,
      天干: { 字: p.stem, 五行: ELEMENT_ZH[p.stemElement], 十神: p.stemTenGod ? g(p.stemTenGod) : "日主（本人）" },
      地支: { 字: p.branch, 五行: ELEMENT_ZH[p.branchElement], 十神: g(p.branchTenGod) },
      藏干: p.hiddenStems.map((h) => `${h.stem}(${g(h.tenGod)})`).join("、"),
    };
  const luckZh = (l: LuckPillar) => `${l.stem}${l.branch} 天干${g(l.stemTenGod)}／地支${g(l.branchTenGod)}`;
  const mark = { 좋음: "佳", 보통: "平", 주의: "留意" } as const;
  return {
    性别: chart.input.gender === "male" ? "男性（乾命）" : "女性（坤命）",
    出生年: Number(chart.solarDate.slice(0, 4)),
    出生时间: pillars.hour ? "已知" : "不详（未排时柱）",
    命局: { 年柱: pillar(pillars.year), 月柱: pillar(pillars.month), 日柱: pillar(pillars.day), 时柱: pillar(pillars.hour) },
    日主: `${chart.dayMaster.stem} ${chart.dayMaster.polarity === "yang" ? "阳" : "阴"}${ELEMENT_ZH[chart.dayMaster.element]}`,
    五行字数: Object.fromEntries(Object.entries(chart.elements.counts).map(([k, v]) => [ELEMENT_ZH[k as keyof typeof ELEMENT_ZH], v])),
    十神分布: Object.fromEntries(Object.entries(chart.tenGodCounts).map(([k, v]) => [g(k as keyof typeof TEN_GOD_HANS), v])),
    身强身弱: `${chart.strength.label}（${chart.strength.score}/100，参考值）`,
    格局: `${a.gyeokguk.label}（${a.gyeokguk.basis}）`,
    参考用神: `${ELEMENT_ZH[u.yongsin]}／喜神 ${ELEMENT_ZH[u.huisin]}／忌神 ${ELEMENT_ZH[u.gisin]}（${u.method}）`,
    大运: {
      方向: chart.daeun.forward ? "顺行" : "逆行",
      列表: chart.daeun.periods.map(
        (p, i) => `${p.startAge}岁起（${p.startYear}～${p.endYear}）${luckZh(p)}・用神契合度 ${a.daeunScores[i]?.score ?? "-"}/100`,
      ),
      目前大运: chart.daeun.current ? luckZh(chart.daeun.current) : "尚未起运",
    },
    流年: a.yearScores.map((y) => `${y.year}年 ${y.ganzhi}・用神契合度 ${y.score}/100`),
    流月: a.monthly.map((m) => `${m.year}年 交节 ${m.startDate.slice(5)}起 ${m.stem}${m.branch}（${g(m.stemTenGod)}／${g(m.branchTenGod)}）${mark[m.mark]}`),
    命格类型: `${chart.grade.tier.type}・${chart.grade.tier.name}（${chart.grade.topPercent <= 15 ? `前 ${chart.grade.topPercent}%，` : ""}${chart.grade.score}/100）・大运巅峰 ${chart.grade.peak ? `${chart.grade.peak.startAge}～${chart.grade.peak.endAge}岁` : "-"}・贵人 ${chart.grade.nobles.filter((n) => n.has).map((n) => (n.name === "천을귀인" ? "天乙贵人" : "文昌贵人")).join("、") || "无"}`,
    开运要素: { 五行: ELEMENT_ZH[a.lucky.element], 颜色: a.lucky.colors, 数字: a.lucky.numbers, 方位: a.lucky.direction, 习惯: a.lucky.habits },
  };
}

const TEN_GOD_TABLE = Object.entries(TEN_GOD_MODERN)
  .map(([g, m]) => `- ${g}: ${m}`)
  .join("\n");

const TEN_GOD_TABLE_ZH = (Object.keys(TEN_GOD_MODERN_ZH) as (keyof typeof TEN_GOD_ZH)[])
  .map((g) => `- ${TEN_GOD_ZH[g]}：${TEN_GOD_MODERN_ZH[g]}`)
  .join("\n");

const TEN_GOD_TABLE_HANS = (Object.keys(TEN_GOD_MODERN_HANS) as (keyof typeof TEN_GOD_HANS)[])
  .map((g) => `- ${TEN_GOD_HANS[g]}：${TEN_GOD_MODERN_HANS[g]}`)
  .join("\n");

const chapterJsonSchema = {
  type: "object",
  properties: {
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          paragraphs: { type: "array", items: { type: "string" } },
        },
        required: ["heading", "paragraphs"],
        additionalProperties: false,
      },
    },
    actionPlan: { type: "array", items: { type: "string" }, description: "이 파트의 실천 개운법 3~5개, 각 한 문장" },
  },
  required: ["sections", "actionPlan"],
  additionalProperties: false,
};

const introJsonSchema = {
  type: "object",
  properties: {
    coverKeywords: { type: "array", items: { type: "string" }, description: "이 사람을 표현하는 키워드 3개, 각 2~6자" },
    summary: { type: "string", description: "명식 전체를 한두 문장으로 요약" },
    preface: { type: "array", items: { type: "string" }, description: "발간사 3~4개 문단" },
  },
  required: ["coverKeywords", "summary", "preface"],
  additionalProperties: false,
};

function partInstructionZh(part: PartKey, years: [number, number]): string {
  if (part === "intro") {
    return `撰寫命書的開頭。
- coverKeywords：封面上代表此人的 3 個核心關鍵字（例：「溫暖的領導者」「深刻的直覺」），每個 2～6 字。
- summary：一兩句話總結整個命盤。
- preface：寫給委託人的序言 3～4 段（共約 500～800 字）。說明如何閱讀與運用這份命書，並描繪命盤的整體印象，但不要提前寫出各章節的細節。`;
  }
  const meta = chaptersFor("zh-Hant")[part];
  const headings = meta.sections.map((s, i) => `${i + 1}. ${withYears(s, years)}`).join("\n");
  return `撰寫${meta.label}「${withYears(meta.title, years)}」章節。（${meta.lead}）
sections 必須依照下列小標題的順序與文字原樣作為 heading，每個小標題寫 3～5 段（每段約 150～280 字）。整個章節約 3,000～4,500 字。
${headings}
actionPlan：符合本章內容的開運行動建議 3～5 條。`;
}

function partInstructionHans(part: PartKey, years: [number, number]): string {
  if (part === "intro") {
    return `撰写命书的开头。
- coverKeywords：封面上代表此人的 3 个核心关键字（例：「温暖的领导者」「深刻的直觉」），每个 2～6 字。
- summary：一两句话总结整个命盘。
- preface：写给委托人的序言 3～4 段（共约 500～800 字）。说明如何阅读与运用这份命书，并描绘命盘的整体印象，但不要提前写出各章节的细节。`;
  }
  const meta = chaptersFor("zh-Hans")[part];
  const headings = meta.sections.map((s, i) => `${i + 1}. ${withYears(s, years)}`).join("\n");
  return `撰写${meta.label}「${withYears(meta.title, years)}」章节。（${meta.lead}）
sections 必须依照下列小标题的顺序与文字原样作为 heading，每个小标题写 3～5 段（每段约 150～280 字）。整个章节约 3,000～4,500 字。
${headings}
actionPlan：符合本章内容的开运行动建议 3～5 条。`;
}

function partInstruction(part: PartKey, years: [number, number]): string {
  if (part === "intro") {
    return `감정서 첫머리를 작성합니다.
- coverKeywords: 표지에 들어갈 이 사람의 핵심 키워드 3개(예: "따뜻한 리더", "깊은 직관").
- summary: 명식 전체 요약 한두 문장.
- preface: 의뢰인에게 건네는 발간사 3~4개 문단(총 600~900자). 이 감정서를 어떻게 읽고 활용하면 좋은지, 명식의 큰 인상을 담되 본문 파트의 세부 내용은 미리 쓰지 않습니다.`;
  }
  const meta = chaptersFor("ko")[part];
  const headings = meta.sections.map((s, i) => `${i + 1}. ${withYears(s, years)}`).join("\n");
  return `${meta.label}. ${withYears(meta.title, years)} 파트를 작성합니다. (${meta.lead})
sections는 아래 소제목을 이 순서, 이 문구 그대로 heading으로 쓰고, 소제목마다 3~5개 문단(문단당 200~350자)으로 씁니다. 파트 전체 분량은 한국어 약 3,500~5,000자입니다.
${headings}
actionPlan: 이 파트 내용에 맞는 실천 개운법 3~5개.`;
}

export class ReadingError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message);
  }
}

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** 예전처럼 생년월일만으로 풀이를 주는 무료 모드. 결제 없이 운영할 때만 FREE_READING=1로 켠다. */
export function isFreeReading(): boolean {
  return process.env.FREE_READING === "1";
}

/**
 * Android 앱(결제 없는 앱 전용 화면)이 보낸 요청인지. 앱에 넣은 키가 Vercel의 APP_ACCESS_KEY와 같으면 무료 풀이를 허용한다.
 * 키는 APK 안에 들어 있어 완전한 비밀은 아니므로, 웹 결제를 우회하는 일반적인 시도를 막는 용도다.
 */
export function isAppRequest(key: string | null): boolean {
  const expected = process.env.APP_ACCESS_KEY ?? "";
  if (expected.length < 16 || !key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const ERRORS = {
  ko: {
    noKey: "ANTHROPIC_API_KEY가 설정되지 않았습니다.",
    auth: "API 키가 올바르지 않습니다.",
    rate: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
    api: (s: string) => `AI 호출 오류(${s}).`,
    network: "네트워크",
    refusal: "AI가 이 파트의 풀이를 생성하지 못했습니다.",
    maxTokens: "풀이가 너무 길어 중간에 끊겼습니다. 다시 시도해 주세요.",
    parse: "AI 응답을 해석하지 못했습니다.",
    shape: "AI 응답 형식이 올바르지 않습니다.",
  },
  "zh-Hant": {
    noKey: "尚未設定 ANTHROPIC_API_KEY。",
    auth: "API 金鑰不正確。",
    rate: "目前請求過多，請稍後再試。",
    api: (s: string) => `AI 呼叫錯誤（${s}）。`,
    network: "網路",
    refusal: "AI 無法產生此章節的解讀。",
    maxTokens: "解讀內容過長而中斷，請再試一次。",
    parse: "無法解析 AI 的回應。",
    shape: "AI 回應的格式不正確。",
  },
  "zh-Hans": {
    noKey: "尚未配置 ANTHROPIC_API_KEY。",
    auth: "API 密钥不正确。",
    rate: "目前请求过多，请稍后再试。",
    api: (s: string) => `AI 调用错误（${s}）。`,
    network: "网络",
    refusal: "AI 无法生成此章节的解读。",
    maxTokens: "解读内容过长而中断，请再试一次。",
    parse: "无法解析 AI 的回应。",
    shape: "AI 回应的格式不正确。",
  },
} satisfies Record<Locale, unknown>;

export async function generatePart(chart: SajuChart, part: PartKey): Promise<PartResult> {
  // 예전에 저장된 명식에는 locale이 없다(한국어).
  const locale: Locale = chart.locale ?? "ko";
  const E = ERRORS[locale];
  if (!isAiEnabled()) throw new ReadingError(E.noKey, 503);

  const years = chart.analysis.reportYears;
  const userContent =
    locale === "zh-Hant"
      ? `${partInstructionZh(part, years)}

【十神現代語】
${TEN_GOD_TABLE_ZH}

【命盤 JSON】
${JSON.stringify(chartForPromptZh(chart), null, 2)}`
      : locale === "zh-Hans"
        ? `${partInstructionHans(part, years)}

【十神现代语】
${TEN_GOD_TABLE_HANS}

【命盘 JSON】
${JSON.stringify(chartForPromptHans(chart), null, 2)}`
        : `${partInstruction(part, years)}

[십신 현대어]
${TEN_GOD_TABLE}

[명식 JSON]
${JSON.stringify(chartForPrompt(chart), null, 2)}`;

  const client = new Anthropic();
  let message;
  try {
    message = await client.beta.messages.create({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // 안전 분류기가 요청을 거절하면 서버에서 대체 모델로 자동 재시도한다.
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: part === "intro" ? introJsonSchema : chapterJsonSchema },
      },
      system: locale === "zh-Hant" ? SYSTEM_PROMPT_ZH : locale === "zh-Hans" ? SYSTEM_PROMPT_HANS : SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new ReadingError(E.auth, 502);
    if (error instanceof Anthropic.RateLimitError) throw new ReadingError(E.rate, 429);
    if (error instanceof Anthropic.APIError) throw new ReadingError(E.api(String(error.status ?? E.network)), 502);
    throw error;
  }

  if (message.stop_reason === "refusal") throw new ReadingError(E.refusal, 502);
  if (message.stop_reason === "max_tokens") throw new ReadingError(E.maxTokens, 502);

  const text = message.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ReadingError(E.parse, 502);
  }

  if (part === "intro") {
    const r = introSchema.safeParse(parsed);
    if (!r.success) throw new ReadingError(E.shape, 502);
    return { part, intro: r.data };
  }
  const r = chapterSchema.safeParse(parsed);
  if (!r.success) throw new ReadingError(E.shape, 502);
  return { part: part as ChapterKey, chapter: r.data };
}
