// 한국어 화면 문구. 다른 언어 사전은 이 모양(Messages)을 그대로 따라야 한다.
import type { ChartNotice, InputErrorCode, BirthRegion } from "../saju/calc";
import type { Element, TenGod } from "../saju/constants";
import type { ChapterKey } from "../report-shared";
import type { ProductId } from "../product";
import { BRAND, PRODUCTS, REPORT_VALID_DAYS } from "../product";
import { CHAPTERS } from "../report-shared";
import { GRADE_TIERS } from "../saju/grade";
import { BRANCH_ANIMAL, ELEMENT_KO, type Branch } from "../saju/constants";
import { LUCKY_BY_ELEMENT, TEN_GOD_MODERN } from "../saju/analysis";

const TEN_GODS: TenGod[] = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
const identity = Object.fromEntries(TEN_GODS.map((g) => [g, g])) as Record<TenGod, string>;
const pad2 = (n: number | string) => String(n).padStart(2, "0");

export const ko = {
  numberLocale: "ko-KR",
  brand: { name: BRAND.name, tagline: BRAND.tagline },
  client: "의뢰인",

  landing: {
    slipSub: "百年綜合四柱",
    h1: "태어난 순간의 여덟 글자로 100년의 흐름을 적어 드립니다",
    heroSub:
      "하늘의 기밀을 열어 인생의 나침반을 밝힙니다. 사주 원국과 대운의 흐름을 정밀하게 계산해, 의뢰인 한 분만을 위한 맞춤 감정서를 엮어 드립니다. 내 사주의 등급은 무료로 먼저 확인하세요.",
    ctaGrade: "내 사주 등급 보기",
    ctaPrice: "감정서 안내",
    gradeTitle: "다섯 등급, 하나의 기준",
    gradeLead: (from: string, to: string, total: string) =>
      `${from}년부터 ${to}년까지 태어날 수 있는 사주 ${total}개를 모두 같은 기준으로 계산했습니다. 오행의 균형, 대운의 도움, 용신의 힘, 귀인을 점수로 매기고 그 안에서 내 자리를 보여 드립니다.`,
    gradeNote:
      "오른쪽 숫자는 전체 사주 가운데 그 등급에 드는 비율입니다. 같은 일주·격국·용신을 가진 사람이 몇 명 중 한 명인지, 천을귀인과 문창귀인이 있는지, 대운의 전성기가 몇 살부터인지도 함께 알려 드립니다.",
    contentsTitle: "한 권에 담기는 다섯 부",
    contentsLead: "등급표와 대운 곡선, 월별 흐름표가 풀이와 함께 책처럼 엮여 PDF로 남습니다.",
    priceTitle: "천기록 주요 감정 안내",
    priceLead:
      "바람의 방향을 아는 배는 길을 잃지 않습니다. 지금 가장 풀리지 않는 고민이나 마주한 전환점이 있다면, 사주 원국과 대운의 흐름으로 그 길을 함께 살펴 드립니다.",
    pick: "추천",
    partsAll: "1~5부 전체",
    partsCore: "1부 천명 · 5부 세운과 개운법",
    partsExtra: "등급표·대운 곡선·월별 흐름표 · 책자형 PDF",
    productSoon: "준비 중입니다",
    applyCta: "생년월일시 넣고 신청하기",
    payPending: "결제는 준비 중입니다.",
    steps: [
      { b: "무료 확인", t: "생년월일시를 넣으면 사주 명식과 등급·희소도를 바로 보여 드립니다." },
      { b: "감정서 신청", t: "감정서를 고르고 성함과 이메일을 적어 결제합니다." },
      {
        b: "완성 메일",
        t: `결제 즉시 작성을 시작하고, 완성되면 감정서 링크를 메일로 보내 드립니다. 링크는 ${REPORT_VALID_DAYS}일 동안 열 수 있고 PDF로 저장할 수 있습니다.`,
      },
    ],
    methodTitle: "이렇게 계산합니다",
    method: [
      {
        dt: "절기 시각",
        dd: "년주와 월주는 입춘·경칩 같은 절기가 바뀌는 시각을 분 단위로 따져 세웁니다. 설날이나 1월 1일이 기준이 아닙니다.",
      },
      {
        dt: "한국 시간의 역사",
        dd: "1954~1961년의 표준시 변경과 1987·1988년 서머타임을 반영해, 그때 시계로 적힌 출생 시각을 바로잡습니다.",
      },
      {
        dt: "태양의 실제 위치",
        dd: "서울의 경도에 맞춰 약 32분을 보정한 진태양시로 시주를 정합니다. 자시 출생의 날짜 기준도 직접 고를 수 있습니다.",
      },
    ],
    formTitle: "1:1 맞춤 감정 신청",
    formLead:
      "생년월일시를 적으면 사주 명식과 등급이 바로 나옵니다. 결과 아래에서 감정서를 골라 신청할 수 있습니다. 태어난 시간을 모르면 ‘모름’을 고르세요. 시주를 빼고 분석합니다.",
    helpTitle: "도움이 필요하신가요?",
    faqTitle: "자주 묻는 질문",
    faq: [
      {
        q: "결제를 어떻게 하는지 잘 모르겠어요.",
        a: "생년월일시를 넣고 '사주 보기'를 누르면 결과 아래에 감정서 신청 칸이 나옵니다. 감정서를 고르고 성함·이메일을 적은 뒤 결제 버튼을 누르면 결제창이 열립니다. 중간에 막히면 아래 상담 안내로 연락 주세요. 하나씩 도와 드립니다.",
      },
      {
        q: "태어난 시간을 모르면 어떻게 하나요?",
        a: "시주를 뺀 여섯 글자로 계산합니다. 등급과 풀이는 그대로 볼 수 있지만, 시주가 들어간 해석은 빠지고 등급에도 '6글자 기준'이라고 표시됩니다.",
      },
      {
        q: "등급은 어떤 기준으로 정하나요?",
        a: "오행 균형(30점), 대운의 도움(30점), 신강·신약 중화(15점), 용신의 힘(15점), 천을·문창귀인(10점)을 더한 점수를, 같은 기간에 태어날 수 있는 모든 사주의 점수와 비교합니다. 학파에 따라 판단이 다를 수 있어 참고용으로 드립니다.",
      },
      {
        q: "음력 생일로도 볼 수 있나요?",
        a: "네. 음력과 윤달을 고를 수 있습니다. 다만 드물게 한국 음력과 하루 차이가 나는 날이 있어, 양력 생일을 알면 양력으로 넣는 것이 가장 정확합니다.",
      },
      {
        q: "입력한 정보는 어디에 쓰이나요?",
        a: "사주 계산에만 씁니다. 풀이를 쓰는 AI에는 이름을 보내지 않고 간지·오행·대운 같은 계산 결과만 보냅니다.",
      },
    ],
  },

  products: Object.fromEntries(Object.values(PRODUCTS).map((p) => [p.id, { name: p.name, summary: p.summary }])) as Record<
    ProductId,
    { name: string; summary: string }
  >,

  form: {
    name: "의뢰인 성함 (선택)",
    namePlaceholder: "홍길동",
    gender: "성별",
    female: "여성(坤命)",
    male: "남성(乾命)",
    birthDate: "생년월일",
    calendarAria: "양력 음력",
    solar: "양력",
    lunar: "음력",
    monthAria: "월",
    month: (m: number) => `${m}월`,
    dayAria: "일",
    day: (d: number) => `${d}일`,
    leapMonth: "윤달",
    birthTime: "태어난 시각",
    hourAria: "시",
    hour: (h: number) => `${h}시`,
    minuteAria: "분",
    minute: (m: number) => `${m}분`,
    unknown: "모름",
    /** 출생지 고르기(한국어 화면에서는 숨긴다) */
    showRegion: false,
    region: "출생지",
    regions: { KR: "한국", TW: "대만", HK: "홍콩" } as Record<BirthRegion, string>,
    advanced: "계산 옵션",
    solarCorrection: (_region: BirthRegion) => "진태양시 보정 (서울 기준 약 -32분)",
    dayBoundary: "자시(23~01시) 출생 일주 기준",
    dayBoundaryAria: "자시 일주 기준",
    at23: "23시에 날짜 변경",
    at0: "자정에 변경(야자시)",
    submit: "사주 보기",
    submitting: "계산 중…",
    yearAria: "년",
    yearPick: "연도 목록에서 선택",
    yearPickPlaceholder: "연도 선택",
    yearOption: (y: string) => `${y}년`,
    requestFailed: "요청에 실패했습니다.",
  },

  errors: {
    year4: "연도는 네 자리 숫자로 입력해 주세요. (예: 1990)",
    before1900: "1900년 이후 날짜만 계산할 수 있습니다.",
    /** 서버가 코드를 주면 이 문장을 쓰고, 없으면 서버 문장을 그대로 쓴다. 한국어는 서버 문장 그대로. */
    input: null as null | ((code: InputErrorCode, params: Record<string, number>) => string),
    future: "생년월일이 오늘 이후입니다. 날짜를 다시 확인해 주세요.",
  },

  grade: {
    title: "내 사주 등급",
    seal: (level: number) => `${level}등급`,
    sealAria: (level: number) => `${level}등급 도장`,
    tiers: Object.fromEntries(GRADE_TIERS.map((t) => [t.level, { name: t.name, desc: t.desc }])) as Record<number, { name: string; desc: string }>,
    top: "상위",
    points: (score: number) => `${score}점 / 100`,
    ladderAria: "다섯 단계 등급",
    level: (level: number) => `${level}등급`,
    me: "◀ 나",
    sameCombo: "나와 같은 사주 조합",
    oneIn: (n: string) => `${n}명 중 1명`,
    peak: "대운 전성기",
    ageRange: (a: number, b: number) => `${a}~${b}세`,
    peakSub: (ganzhi: string, score: number) => `${ganzhi} 대운 · 용신 부합도 ${score}`,
    nobles: { 천을귀인: "천을귀인", 문창귀인: "문창귀인" } as Record<"천을귀인" | "문창귀인", string>,
    has: "있음",
    none: "없음",
    nobleShare: (p: number) => `전체 사주의 ${p}%가 가진 귀인`,
    basisTitle: "등급 근거",
    parts: { balance: "오행 균형", daeun: "대운의 도움", harmony: "신강·신약 중화", yongsin: "용신의 힘", noble: "귀인" },
    footnote: (from: string, to: string, total: string) =>
      `${from}~${to}년에 태어날 수 있는 사주 ${total}개(날짜 × 12시진 × 성별)를 모두 같은 기준으로 계산해 비교한 상대 등급입니다. 오행 균형, 대운의 도움, 중화, 용신, 귀인을 점수화했으며 학파에 따라 판단이 다를 수 있어 참고용으로 제시합니다.`,
    partial: " 태어난 시각을 몰라 시주를 뺀 6글자로 계산했습니다.",
    /** 같은 조합 설명(일주·격국·용신). null이면 계산 결과의 한국어 문장을 쓴다. */
    rarityLabel: null as null | ((dayPillar: string, gyeokguk: string, yongsin: string) => string),
  },

  chart: {
    tenGod: identity,
    /** 격국 이름: 비견→건록격, 겁재→양인격, 그 밖에는 "○○격" */
    gyeokguk: (god: TenGod) => (god === "비견" ? "건록격" : god === "겁재" ? "양인격" : `${god}격`),
    /** 격국 근거. null이면 계산 결과의 한국어 문장 */
    gyeokgukBasis: null as null | ((monthBranch: string, stem: string, revealed: boolean) => string),
    element: ELEMENT_KO as Record<Element, string>,
    elementShort: (e: Element) => ELEMENT_KO[e].slice(0, 1),
    /** 글자 아래 작은 읽기: 한국어는 "갑 · 목" */
    glyphReading: (ko: string, e: Element) => `${ko} · ${ELEMENT_KO[e].slice(0, 1)}`,
    pillarLabels: { hour: "시주", day: "일주", month: "월주", year: "년주" },
    unknown: "모름",
    dayMaster: "일간(나)",
    hiddenStems: "지장간",
    pillarsTitle: (name?: string) => (name ? `${name} 님의 사주 명식` : "사주 명식"),
    solar: "양력",
    lunar: "음력",
    lunarDate: null as null | ((l: { year: number; month: number; day: number; leap: boolean }) => string),
    dayStem: "일간",
    zodiacLabel: "띠",
    zodiac: (b: Branch) => BRANCH_ANIMAL[b],
    strengthLabel: "신강·신약",
    strength: { 극신약: "극신약", 신약: "신약", 중화: "중화", 신강: "신강", 극신강: "극신강" } as Record<string, string>,
    strengthRef: (score: number) => `(참고 ${score}점)`,
    /** 시각·경고 안내. null이면 계산 결과의 한국어 문장 */
    timeNote: null as null | ((t: { local: string; corrected: boolean; longitude: number; standardOffset: number }) => string),
    notice: null as null | ((n: ChartNotice) => string),
    elementTitle: "오행 밸런스",
    donutAria: "오행 비중 원형 차트",
    donutSub: (e: Element) => `일간 ${ELEMENT_KO[e].slice(0, 1)}`,
    legend: (pct: number, count: number) => `${pct}% · 글자 ${count}개`,
    elementNote: "비중은 지장간까지 나눠 더한 점수 기준이며, 글자 수는 겉으로 드러난 여덟(또는 여섯) 글자 기준입니다.",
    missing: (list: string) => ` 원국에 없는 오행: ${list}.`,
    listSep: ", ",
    analysisTitle: "격국과 참고 용신",
    gyeokgukLabel: "격국",
    yongsin: "참고 용신",
    yongsinSub: "삶의 균형을 잡아 주는 기운",
    huisin: "희신",
    huisinSub: "용신을 돕는 기운",
    gisin: "기신",
    gisinSub: "조절이 필요한 기운",
    /** 용신 근거. null이면 계산 결과의 한국어 문장 */
    method: null as null | ((basis: "weak" | "strong" | "balanced") => string),
    schoolNote: "학파에 따라 판단이 다를 수 있어 참고용으로 제시합니다.",
    tenGodTitle: "나의 십신, 현대어로 읽기",
    tenGodHead: ["십신", "개수", "현대적 해석"],
    tenGodModern: TEN_GOD_MODERN as Record<TenGod, string>,
    curveAria: "10년 대운 흐름 그래프",
    curveAxis: { 100: "순풍", 50: "보통", 0: "조심" } as Record<number, string>,
    current: "현재",
    peak: "전성기",
    age: (a: number) => `${a}세`,
    curvePoint: (age: number, gz: string, score: number) => `${age}세 ${gz} · 부합도 ${score}`,
    daeunTitle: "10년 대운 흐름",
    daeunSub: (forward: boolean, start: number) => `(${forward ? "순행" : "역행"}, ${start}세 시작)`,
    daeunNote: (yongsin: string) => `곡선은 각 대운이 참고 용신(${yongsin})과 얼마나 맞는지를 나타낸 참고 지표입니다.`,
    luckReading: (ko: string) => ko,
    yearFlowTitle: (y1: number, y2: number) => `${y1}-${y2} 세운과 월별 흐름`,
    year: (y: number) => `${y}년`,
    yearScore: (s: number) => `용신 부합도 ${s}/100`,
    monthTitle: (y: number) => `${y}년 월별 흐름`,
    monthHead: ["절입일", "월", "키워드(십신)", "흐름"],
    mark: { 좋음: "좋음", 보통: "보통", 주의: "주의" } as Record<"좋음" | "보통" | "주의", string>,
    monthNote: "달은 절기(절입일)를 기준으로 바뀝니다. 흐름 표시는 참고 용신과의 부합도로 정했습니다.",
    luckyTitle: "행운의 색상·숫자·방위",
    luckyElement: "행운의 오행",
    colors: "색상",
    numbers: "숫자",
    direction: "방위",
    habits: "도움이 되는 습관",
    lucky: LUCKY_BY_ELEMENT as Record<Element, { colors: string; numbers: string; direction: string; habits: string }>,
  },

  chapters: Object.fromEntries(
    (Object.keys(CHAPTERS) as ChapterKey[]).map((k) => [k, { label: CHAPTERS[k].label, title: CHAPTERS[k].title, lead: CHAPTERS[k].lead, sections: CHAPTERS[k].sections }]),
  ) as Record<ChapterKey, { label: string; title: string; lead: string; sections: string[] }>,

  report: {
    preface: "발간사",
    toc: "목차",
    methodTitle: "감정서 작성 방식 및 고지",
    noReadingTitle: "항목별 풀이",
    noReading: "AI 풀이가 연결되지 않아 계산 결과만 보여 드립니다.",
    writing: (label: string) => `${label} 풀이를 작성하고 있습니다. 1~2분 정도 걸립니다.`,
    retry: "이 파트 다시 작성",
    actionPlan: "실천 개운법",
    watermark: (brand: string, name: string) => `${brand} · ${name}님 전용 감정서 · 무단 복제 및 재배포 금지`,
    coverSub: "1:1 맞춤 정밀 사주 감정서",
    coverTagline: ["하늘이 정해둔 당신의 그릇과 때(時)를 읽다", "인생의 전환점을 밝히는 지혜로운 나침반"],
    coverName: (name: string) => `${name} 님`,
    pillarsAria: "사주 팔자(시·일·월·년)",
    coverBirthLabel: "생년월일",
    coverBirth: (p: { y: string; m: string; d: string; lunar: boolean; lunarText: string; hourBranch: string | null }) =>
      `${p.lunar ? `음력 ${p.lunarText} (양력 ${p.y}.${p.m}.${p.d})` : `${p.y}년 ${p.m}월 ${p.d}일 (양력)`} ${p.hourBranch ? `${p.hourBranch}時` : "태어난 시각 미상"}`,
    issued: (date: { y: number; m: number; d: number }, brand: string) =>
      `발행일자 ${date.y}년 ${pad2(date.m)}월 ${pad2(date.d)}일 · ${brand} 운명연구원 봉정`,
    coverFoot: "의뢰인 본인 열람용 비밀 문서 · Strictly Confidential & Personal",
    sealTitle: (brand: string) => `${brand} 직인`,
    /** 발행일 기준 시간대(분) */
    issueOffset: 540,
  },

  methodBox: {
    title: "감정서 작성 방식 및 고지",
    basis: (timeKnown: boolean, corrected: boolean): string =>
      timeKnown ? (corrected ? "절기 시각과 진태양시를 반영한" : "절기 시각을 반영한") : "절기 시각을 반영한(태어난 시각 미상으로 시주 제외)",
    calcLabel: "명식 산출:",
    calc: (basis: string) => ` ${basis} 정밀 만세력 엔진이 사주팔자·오행·십신·대운·격국과 참고 용신, 월별 흐름을 계산했습니다.`,
    aiLabel: "풀이 작성:",
    ai: " 방대한 지식을 학습한 최신 유료 AI 모델(Anthropic Claude)이 위 명식을 근거로 작성했습니다.",
    disclaimerLabel: "면책 고지:",
    disclaimer:
      " 이 감정서는 명리학 이론에 기반한 참고 자료이며 미래를 보장하지 않습니다. 의료·법률·재무 등 전문 판단을 대신하지 않고, 감정서를 참고한 선택과 그 결과에 대한 책임은 의뢰인에게 있습니다.",
    useLabel: "이용 범위:",
    use: (name: string) => ` 이 감정서는 ${name}님 개인 열람용이며, 무단 복제·배포·판매를 금합니다.`,
  },

  actions: {
    pdf: "PDF로 저장",
    html: "HTML로 저장",
    busy: "풀이가 끝나면 풀이까지 포함해 저장할 수 있습니다.",
    hint: "PDF는 인쇄 화면에서 “PDF로 저장”을 고르세요. PDF를 못 여는 분께는 HTML 파일을 보내 주세요(인터넷 브라우저로 열림).",
  },

  support: {
    lead: (hasChat: boolean) =>
      `결제 방법, 생년월일 입력, 감정서 받는 법 등 무엇이든 편하게 물어 주세요. ${hasChat ? "카카오톡으로 1:1 상담해 드리며, 그 밖의 문의는 이메일로 받습니다." : "이메일로 문의해 주시면 도와 드립니다."}`,
    kakao: "카카오톡 1:1 상담",
    kakaoFloat: "카톡 상담",
    kakaoFloatAria: "카카오톡으로 1:1 상담하기",
    showKakao: true,
    mail: (email: string) => `이메일 문의 ${email}`,
    mailSubject: "[천기록] 문의",
  },

  footer: {
    linksAria: "약관 및 방침",
    terms: "이용약관",
    privacy: "개인정보처리방침",
    refund: "환불 규정",
    biz: {
      companyName: "상호",
      ceo: "대표",
      bizNumber: "사업자등록번호",
      mailOrderNumber: "통신판매업 신고",
      address: "주소",
      contact: "고객센터",
    },
    pending: "등록 예정",
    note: (brand: string) =>
      `명식은 만세력 계산 엔진이, 풀이 문장은 AI(Claude)가 작성합니다. 명리학 이론에 기반한 참고 자료이며 미래를 보장하지 않습니다. 결제는 토스페이먼츠가 처리하며 카드 정보는 ${brand}에 저장되지 않습니다.`,
    languages: "언어",
  },

  meta: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: "절기를 분 단위로 맞춘 만세력으로 사주를 세우고, 다섯 등급 가운데 내 사주의 자리와 100년의 대운 흐름을 알려 드립니다.",
  },
};

export type Messages = typeof ko;
