// 웹사이트(첫 화면·하단·상담 안내)의 나라별 문구. 한국어는 루트(/), 대만은 /zh-tw, 홍콩은 /zh-hk, 영어는 /en.
// 명식·등급·감정서 문구는 messages.ts(번체 zh-Hant)를 그대로 쓰고, 여기에는 사이트에만 있는 문구를 둔다.
import { BRAND, PRODUCTS, REPORT_VALID_DAYS, type CoreProductId, type ProductId } from "./product";
import type { Locale, Region } from "./saju/locale";

export type SiteLocale = "ko" | "zh-TW" | "zh-HK" | "en";

export interface SiteConfig {
  site: SiteLocale;
  /** 주소 앞부분. 한국어는 "" */
  path: "" | "/zh-tw" | "/zh-hk" | "/en";
  /** 명식·감정서 문구의 언어(messages.ts) */
  locale: Locale;
  htmlLang: string;
  hreflang: string;
  ogLocale: string;
  /** 출생 지역 선택지(첫째가 기본값) */
  regions: Region[];
  /** 언어 전환 링크에 쓰는 이름 */
  label: string;
  /** 이 화면에서 감정서를 팔지. 해외 결제가 붙기 전까지 대만·홍콩은 false */
  sales: boolean;
}

export const SITES: Record<SiteLocale, SiteConfig> = {
  ko: { site: "ko", path: "", locale: "ko", htmlLang: "ko", hreflang: "ko-KR", ogLocale: "ko_KR", regions: ["KR"], label: "한국어", sales: true },
  "zh-TW": {
    site: "zh-TW",
    path: "/zh-tw",
    locale: "zh-Hant",
    htmlLang: "zh-Hant-TW",
    hreflang: "zh-TW",
    ogLocale: "zh_TW",
    regions: ["TW", "HK", "KR"],
    label: "繁體中文（台灣）",
    sales: false,
  },
  "zh-HK": {
    site: "zh-HK",
    path: "/zh-hk",
    locale: "zh-Hant",
    htmlLang: "zh-Hant-HK",
    hreflang: "zh-HK",
    ogLocale: "zh_HK",
    regions: ["HK", "TW", "KR"],
    label: "繁體中文（香港）",
    sales: false,
  },
  en: {
    site: "en",
    path: "/en",
    locale: "en",
    htmlLang: "en",
    hreflang: "en",
    ogLocale: "en_US",
    regions: ["KR", "TW", "HK", "CN"],
    label: "English",
    sales: false,
  },
};

export const SITE_ORDER: SiteLocale[] = ["ko", "zh-TW", "zh-HK", "en"];

/** 주소(pathname)로 사이트 언어를 고른다. */
export function siteFromPath(pathname: string): SiteLocale {
  if (pathname === "/zh-tw" || pathname.startsWith("/zh-tw/")) return "zh-TW";
  if (pathname === "/zh-hk" || pathname.startsWith("/zh-hk/")) return "zh-HK";
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  return "ko";
}

/** 손님이 고른 언어를 기억하는 쿠키(1년). 있으면 브라우저 언어보다 먼저 따른다. */
export const SITE_LANG_COOKIE = "site_lang";

export const isSiteLocale = (v: unknown): v is SiteLocale => v === "ko" || v === "zh-TW" || v === "zh-HK" || v === "en";

/**
 * 브라우저·기기 언어(Accept-Language)로 첫 화면 언어를 고른다. 우선순위가 높은 언어부터 보고,
 * 한국어 → 한국어, 홍콩·마카오 중국어 → 홍콩, 그 밖의 중국어(대만·번체·간체) → 대만. 해당이 없으면 null(한국어 그대로).
 * 영어 브라우저는 옮기지 않는다(검색 로봇이 영어로 와도 한국어 첫 화면을 읽게). 영어판(/en)은 언어 링크로 고른다.
 */
export function siteFromAcceptLanguage(header: string | null | undefined): SiteLocale | null {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(";");
      const q = Number(params.find((p) => p.trim().startsWith("q="))?.trim().slice(2) ?? 1);
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0, i };
    })
    .filter((t) => t.tag && t.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  for (const { tag } of tags) {
    if (tag === "ko" || tag.startsWith("ko-")) return "ko";
    if (tag === "zh" || tag.startsWith("zh-")) {
      return /-(hk|mo)\b/.test(tag) ? "zh-HK" : "zh-TW";
    }
  }
  return null;
}

/** 검색엔진에 알려 줄 언어별 주소(hreflang). */
export function languageAlternates(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of SITE_ORDER) out[SITES[s].hreflang] = SITES[s].path || "/";
  out["x-default"] = "/";
  return out;
}

const KO = {
  numberLocale: "ko-KR",
  brand: { name: BRAND.name, tagline: BRAND.tagline },
  landing: {
    slipSub: "百年綜合四柱",
    h1: "태어난 순간의 여덟 글자로 100년의 흐름을 적어 드립니다",
    heroSub:
      "하늘의 기밀을 열어 인생의 나침반을 밝힙니다. 사주 원국과 대운의 흐름을 정밀하게 계산해, 의뢰인 한 분만을 위한 맞춤 감정서를 엮어 드립니다. 내 사주의 유형은 무료로 먼저 확인하세요.",
    ctaGrade: "내 사주 유형 무료로 확인하기",
    ctaPrice: "감정서 안내",
    trustEyebrow: "천기록의 원칙",
    trustTitle: "재미로 보는 운세가 아닙니다",
    trustLead:
      "누구에게나 들어맞는 듣기 좋은 말 대신, 의뢰인의 여덟 글자에서 출발해 명리학의 원리대로 하나하나 따져 쓴 풀이입니다. 방대한 계산 자료와 정통 이론이 모든 문장의 근거가 됩니다.",
    pledgeTitle: "값을 받는 서비스이기에 지키는 약속",
    pledge: [
      "‘무조건 대박’, ‘반드시 이루어진다’처럼 과장된 약속을 하지 않습니다.",
      "검증할 수 없는 경력이나 통계, 지어낸 후기를 내세우지 않습니다.",
      "감정서에 적힌 유형 비율·대운 점수·획수·절기 시각은 모두 실제 계산한 값입니다.",
      "사주는 삶을 돌아보는 참고 자료이며 미래를 보장하지 않는다는 점을 분명히 밝힙니다.",
    ],
    trust: (from: string, to: string, total: string) => [
      {
        n: total,
        t: `개 사주를 같은 기준으로 계산`,
        d: `${from}~${to}년에 태어날 수 있는 모든 사주(날짜 × 12시진 × 성별)를 같은 기준으로 계산해, 내 사주가 그 안에서 어디쯤인지 견주어 봅니다.`,
      },
      {
        n: "분 단위",
        t: "절기 시각과 진태양시",
        d: "입춘·경칩 같은 절기가 바뀌는 시각을 분 단위로 따지고, 출생지 경도로 진태양시를 맞추며, 그때의 표준시 변경과 서머타임까지 바로잡아 명식을 세웁니다.",
      },
      {
        n: "정통 자평명리",
        t: "의 계산 순서 그대로",
        d: "오행과 십신, 지장간, 격국과 용신, 10년 대운과 해마다의 세운, 절기 기준 월운까지 명리학의 체계를 빠짐없이 따라 풀이의 뼈대를 세웁니다.",
      },
      {
        n: "근거 없는 말",
        t: "은 쓰지 않습니다",
        d: "풀이 문장은 계산된 명식 값에서만 나옵니다. 막연한 덕담이나 겁주는 단정 대신, 근거가 된 간지·오행을 밝히고 약점에는 실천 개운법을 함께 드립니다.",
      },
    ],
    gradeTitle: "다섯 유형, 하나의 기준",
    gradeLead: (from: string, to: string, total: string) =>
      `${from}년부터 ${to}년까지 태어날 수 있는 사주 ${total}개를 모두 같은 기준으로 계산했습니다. 오행의 균형, 대운의 도움, 용신의 힘, 귀인을 점수로 매기고 그 안에서 내 자리를 보여 드립니다.`,
    gradeNote:
      "오른쪽 숫자는 전체 사주 가운데 그 유형에 드는 비율입니다. 같은 일주·격국·용신을 가진 사람이 몇 명 중 한 명인지, 천을귀인과 문창귀인이 있는지, 대운의 전성기가 몇 살부터인지도 함께 알려 드립니다.",
    contentsTitle: "한 권에 담기는 다섯 부",
    contentsLead: "유형표와 대운 곡선, 월별 흐름표가 풀이와 함께 책처럼 엮여 PDF로 남습니다.",
    priceTitle: "천기록 주요 감정 안내",
    priceLead:
      "바람의 방향을 아는 배는 길을 잃지 않습니다. 지금 가장 풀리지 않는 고민이나 마주한 전환점이 있다면, 사주 원국과 대운의 흐름으로 그 길을 함께 살펴 드립니다.",
    pick: "추천",
    partsAll: "1~5부 전체",
    partsCore: "1부 천명 · 5부 세운과 개운법",
    partsExtra: "유형표·대운 곡선·월별 흐름표 · 책자형 PDF",
    partsNaming: "추천 이름 5개 · 수리 4격·자원오행·발음오행 풀이 · 순한글 이름 · 책자형 PDF",
    productSoon: "준비 중입니다",
    applyCta: "생년월일시 넣고 신청하기",
    payPending: "결제는 준비 중입니다.",
    steps: [
      { b: "무료 확인", t: "생년월일시를 넣으면 사주 명식과 유형·희소도를 바로 보여 드립니다." },
      { b: "감정서 신청", t: "감정서를 고르고 성함과 연락처(이메일·휴대폰)를 적어 결제합니다. 주문번호·결제 내역과 감정서 파일은 고르신 곳(이메일·카카오톡·문자)으로 보내 드립니다." },
      {
        b: "완성 안내",
        t: `결제 즉시 작성을 시작합니다. 명식 계산, 다섯 부의 풀이 작성, 책자 편집을 거쳐 약 3분 뒤 화면에 감정서가 열리고, PDF 파일과 HTML 문서로 바로 저장하실 수 있습니다. 감정서 화면은 ${REPORT_VALID_DAYS}일 동안 다시 열 수 있습니다.`,
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
      "생년월일시를 적으면 사주 명식과 유형이 바로 나옵니다. 결과 아래에서 감정서를 골라 신청할 수 있습니다. 태어난 시간을 모르면 ‘모름’을 고르세요. 시주를 빼고 분석합니다.",
    helpTitle: "도움이 필요하신가요?",
    faqTitle: "자주 묻는 질문",
    faq: [
      {
        q: "결제를 어떻게 하는지 잘 모르겠어요.",
        a: "생년월일시를 넣고 '사주 보기'를 누르면 결과 아래에 감정서 신청 칸이 나옵니다. 감정서를 고르고 성함과 연락처를 적은 뒤 결제 버튼을 누르면 결제창이 열립니다. 중간에 막히면 아래 상담 안내로 연락 주세요. 하나씩 도와 드립니다.",
      },
      {
        q: "결제하면 감정서는 언제 받을 수 있나요?",
        a: "결제하는 즉시 작성을 시작해 약 3분 뒤 화면에 감정서가 열립니다. 열리면 PDF 파일 저장·HTML 문서 저장 버튼으로 바로 내려받으실 수 있고, 신청 3분 뒤에는 고르신 곳(이메일·카카오톡·문자)으로도 두 파일을 보내 드립니다. 주소를 잃어버리셔도 '주문 조회'에서 주문번호와 연락처로 다시 찾을 수 있습니다.",
      },
      {
        q: "메일이나 문자가 오지 않으면 어떻게 하나요?",
        a: "스팸함을 먼저 확인해 주세요. 그래도 없으면 사이트 맨 아래 '주문 조회'에서 주문번호와 주문할 때 적은 휴대폰 번호(또는 이메일)를 넣으면 감정서가 바로 열립니다. 주문번호를 모르시면 아래 상담 안내로 연락 주세요.",
      },
      {
        q: "감정서 내용은 무작위로 만들어지나요?",
        a: "아닙니다. 생년월일시로 만세력(절기 시각 기준)을 세우고 십신·용신·대운·세운 같은 값을 정해진 명리 공식으로 계산한 뒤, 그 계산값만을 근거로 감정서를 씁니다. 같은 생년월일시면 계산값은 언제나 같고, 근거가 된 명식표와 점수표를 감정서 안에서 직접 확인하실 수 있습니다. 주역 점만은 점법대로 괘를 한 번 얻는 과정이 있지만, 그 괘의 풀이는 『주역』 원문과 정해진 점법을 따릅니다.",
      },
      {
        q: "AI 상담은 일반 AI에게 묻는 것과 무엇이 다른가요?",
        a: "일반 AI 채팅은 생년월일을 알려 줘도 사주를 실제로 계산하지 않고, 누구에게나 들어맞을 법한 상투적인 말로 답하기 쉽습니다. 천기록 AI 상담은 먼저 의뢰인의 생년월일시로 만세력(절기 시각 기준)을 세우고 오행 분포·십신·용신·대운·세운을 명리 공식으로 계산해 조회합니다. 그다음 대운·세운·월별 흐름까지 계산한 방대한 명식 자료와 명리 이론을 근거로, 유료 고성능 AI가 질문에 맞춰 답합니다. 명식에 없는 간지나 날짜를 지어내지 않고, 답할 때 어떤 간지·십신을 근거로 했는지 함께 밝힙니다. AI 상담은 카카오로 가입한 회원이 메뉴의 'AI 상담'에서 이용할 수 있습니다.",
      },
      {
        q: "사주를 잘 믿지 않아도 볼 수 있나요?",
        a: "물론입니다. 천기록 감정서는 앞날을 단정하는 예언이 아니라, 명리학의 원리로 내 성향과 흐름을 정리한 참고 자료입니다. 결정을 대신하지 않고, 스스로 결정할 때 살펴볼 거리를 드립니다.",
      },
      {
        q: "태어난 시간을 모르면 어떻게 하나요?",
        a: "시주를 뺀 여섯 글자로 계산합니다. 유형과 풀이는 그대로 볼 수 있지만, 시주가 들어간 해석은 빠지고 유형에도 '6글자 기준'이라고 표시됩니다.",
      },
      {
        q: "유형은 어떤 기준으로 정하나요?",
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
    /** 결과 아래 안내(해외 화면에서 감정서 준비 중일 때). 한국어는 쓰지 않는다. */
    resultNotice: null as null | { title: string; text: string },
  },
  products: Object.fromEntries(Object.values(PRODUCTS).map((p) => [p.id, { name: p.name, summary: p.summary }])) as Record<
    CoreProductId,
    { name: string; summary: string }
  > &
    Partial<Record<ProductId, { name: string; summary: string }>>,
  support: {
    lead: (hasChat: boolean) =>
      `결제 방법, 생년월일 입력, 감정서 저장하는 법 등 무엇이든 편하게 물어 주세요. ${hasChat ? "카카오톡으로 1:1 상담해 드리며, 그 밖의 문의는 이메일로 받습니다." : "이메일로 문의해 주시면 도와 드립니다."}`,
    kakao: "카카오톡 1:1 상담",
    kakaoFloat: "카톡 상담",
    kakaoFloatAria: "카카오톡으로 1:1 상담하기",
    /** 카카오톡을 거의 쓰지 않는 나라 화면에서는 숨긴다 */
    showKakao: true,
    mail: (email: string) => `이메일 문의 ${email}`,
    mailSubject: "[천기록] 문의",
  },
  footer: {
    linksAria: "약관 및 방침",
    terms: "이용약관",
    lookup: "주문 조회",
    privacy: "개인정보처리방침",
    refund: "환불 규정",
    biz: { companyName: "상호", ceo: "대표", bizNumber: "사업자등록번호", mailOrderNumber: "통신판매업 신고", address: "주소", contact: "고객센터" },
    pending: "등록 예정",
    note: (brand: string) =>
      `명식은 만세력 계산 엔진이 산출하고, 풀이 문장은 AI 기술로 작성합니다. 명리학 이론에 기반한 참고 자료이며 미래를 보장하지 않습니다. 결제는 토스페이먼츠가 처리하며 카드 정보는 ${brand}에 저장되지 않습니다.`,
    languages: "언어",
  },
  meta: {
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: "절기를 분 단위로 맞춘 만세력으로 사주를 세우고, 다섯 유형 가운데 내 사주의 자리와 100년의 대운 흐름을 알려 드립니다.",
  },
};

export type SiteCopy = typeof KO;

const ZH_TW: SiteCopy = {
  numberLocale: "zh-TW",
  brand: { name: "天機錄", tagline: "百年綜合八字" },
  landing: {
    slipSub: "百年綜合八字",
    h1: "以出生那一刻的八個字，為您寫下百年運勢",
    heroSub: "開啟天機，照亮人生的羅盤。精密推算八字命局與大運走向，為每一位委託人編撰專屬命書。您的命格類型，可先免費查看。",
    ctaGrade: "查看我的命格類型",
    ctaPrice: "命書介紹",
    trustEyebrow: "天機錄的原則",
    trustTitle: "不是隨便看看的運勢",
    trustLead: "我們不寫人人適用的好聽話，而是從委託人的八個字出發，依命理學原理逐一推算、撰寫解讀。龐大的計算資料與正統理論，是每一句話的依據。",
    pledgeTitle: "正因為是付費服務，我們堅守的承諾",
    pledge: [
      "不做「保證大發」「一定成真」之類的誇大承諾。",
      "不標榜無法查證的資歷、統計或杜撰的評價。",
      "命書中的類型比例、大運分數、筆畫數、節氣時刻，全部是實際計算的數值。",
      "清楚說明八字是回顧人生的參考資料，不保證未來。",
    ],
    trust: (from, to, total) => [
      { n: total, t: " 組八字以同一標準計算", d: `計算 ${from}～${to} 年間可能出生的所有八字（日期 × 12 時辰 × 性別），比較您的八字在其中的位置。` },
      { n: "精確到分鐘", t: "的節氣與真太陽時", d: "以分鐘為單位判斷立春、驚蟄等節氣交接時刻，依出生地經度校正真太陽時，並還原當時的標準時間與夏令時間。" },
      { n: "正統子平", t: "的推算順序", d: "五行、十神、藏干、格局與用神、十年大運與流年、以節氣為界的流月，完整依照命理體系建立解讀的骨架。" },
      { n: "不寫沒有根據的話", t: "", d: "解讀只來自計算出的命盤數值。不寫空泛的客套或嚇人的斷言，說明依據的干支與五行，並在弱點旁附上開運方法。" },
    ],
    gradeTitle: "五種類型，同一把尺",
    gradeLead: (from, to, total) =>
      `我們以同一標準，計算了 ${from} 年至 ${to} 年間可能出現的全部 ${total} 組八字。將五行平衡、大運助力、用神力量與貴人化為分數，告訴您在其中的位置。`,
    gradeNote:
      "右側數字為該類型在全部八字中所佔的比例。同時告訴您：與您相同日柱・格局・用神的人是幾人中的一位、是否有天乙貴人與文昌貴人，以及大運巔峰從幾歲開始。",
    contentsTitle: "一冊收錄的五章",
    contentsLead: "類型表、大運曲線、流月運勢表與解讀一同裝訂成冊，以 PDF 保存。",
    priceTitle: "天機錄 命書服務",
    priceLead: "繁體中文版完整命書正在準備中，開放後將在此頁面公告。目前可先免費查看八字命盤與命格類型。",
    pick: "推薦",
    partsAll: "第一至第五章全冊",
    partsCore: "第一章 天命・第五章 流年與開運法",
    partsExtra: "類型表・大運曲線・流月運勢表・書冊式 PDF",
    partsNaming: "推薦名字 5 個・數理四格・字源五行・發音五行解說・書冊式 PDF",
    productSoon: "準備中",
    applyCta: "輸入生辰後申請",
    payPending: "即將開放",
    steps: [
      { b: "免費查看", t: "輸入出生年月日時，立即顯示八字命盤、命格類型與稀有度。" },
      { b: "申請命書", t: "選擇命書，填寫姓名與電子郵件後付款（繁體中文版準備中）。" },
      { b: "完成通知", t: `付款後立即開始撰寫，約 3 分鐘後即可在畫面上閱讀，並可直接下載 PDF 與 HTML 檔案。連結可於 ${REPORT_VALID_DAYS} 天內開啟。` },
    ],
    methodTitle: "我們這樣推算",
    method: [
      { dt: "節氣時刻", dd: "年柱與月柱以立春、驚蟄等節氣交接的時刻為準，精確到分鐘。不是以農曆新年或 1 月 1 日為界。" },
      {
        dt: "出生地的時間歷史",
        dd: "依出生地（台灣・香港・韓國）當時實施的標準時間與夏令時間校正，將當年時鐘記下的出生時刻還原為正確時間。",
      },
      { dt: "太陽的實際位置", dd: "依出生地經度換算真太陽時（台北約 +6 分、香港約 -23 分）來定時柱。子時出生的換日標準也可自行選擇。" },
    ],
    formTitle: "免費查看八字命盤",
    formLead: "填寫出生年月日時，即可看到八字命盤與命格類型。不知道出生時間，請勾選「不詳」，將以去掉時柱的六個字分析。",
    helpTitle: "需要協助嗎？",
    faqTitle: "常見問題",
    faq: [
      { q: "不知道出生時間怎麼辦？", a: "會以去掉時柱的六個字計算。類型與命盤照樣可以查看，但與時柱相關的解讀會省略，類型旁也會註明以六字計算。" },
      {
        q: "類型是怎麼評定的？",
        a: "將五行平衡（30 分）、大運助力（30 分）、身強身弱的中和程度（15 分）、用神力量（15 分）、天乙・文昌貴人（10 分）相加，再與同一期間可能出生的所有八字比較。各派判斷可能不同，僅供參考。",
      },
      { q: "可以用農曆生日查詢嗎？", a: "可以。可選擇農曆與閏月。若知道國曆生日，用國曆輸入最為準確。" },
      { q: "在台灣以外出生也可以嗎？", a: "可以。請選擇出生地區（台灣・香港・韓國），系統會依當地的時區與夏令時間計算。" },
      { q: "什麼時候可以購買完整命書？", a: "繁體中文版完整命書正在準備中，開放後會在此頁面公告。如有疑問，歡迎來信詢問。" },
      { q: "輸入的資料會用在哪裡？", a: "只用於八字計算。撰寫解讀的 AI 不會收到您的姓名，只會收到干支・五行・大運等計算結果。" },
    ],
    resultNotice: { title: "完整命書", text: "繁體中文版完整命書（各章詳細解讀）正在準備中，開放後將在此頁面公告。以下為排盤結果。" },
  },
  products: {
    core: { name: "天機錄 核心命盤錄", summary: "先天本質與五行平衡，{Y1}～{Y2} 流年與流月運勢重點分析" },
    full: { name: "天機錄 綜合命書", summary: "一生大運走向、先天財富格局、事業運、姻緣運、專屬開運法" },
    naming: { name: "吉運開運命名錄", summary: "補足八字所缺五行，依數理與字義五行量身取名・改名" },
  },
  support: {
    lead: () => "八字輸入、查看結果等任何問題，歡迎來信詢問，我們會盡快回覆。",
    kakao: "",
    kakaoFloat: "",
    kakaoFloatAria: "",
    showKakao: false,
    mail: (email) => `電子郵件詢問 ${email}`,
    mailSubject: "[天機錄] 詢問",
  },
  footer: {
    linksAria: "條款與政策",
    terms: "服務條款（韓文）",
    lookup: "訂單查詢（韓文）",
    privacy: "隱私權政策（韓文）",
    refund: "退款規定（韓文）",
    biz: { companyName: "公司名稱", ceo: "負責人", bizNumber: "營業登記號碼", mailOrderNumber: "通訊銷售業申報", address: "地址", contact: "客服" },
    pending: "登記中",
    note: () => "命盤由萬年曆計算引擎推算，解讀文字以 AI 技術撰寫。本服務為根據命理學理論的參考資料，不保證未來。本服務由韓國的天機錄營運。",
    languages: "語言",
  },
  meta: {
    title: "天機錄 — 百年綜合八字｜我的命格是哪一型？",
    description: "以精確到分鐘的節氣萬年曆排出八字，告訴您在五種類型中的位置與百年大運走勢。依台灣時區與夏令時間計算，可免費查看。",
  },
};

/** 문자열 안의 대만식 표현을 홍콩식으로 바꾼다. 함수는 결과 문자열에 적용한다. */
function toHK<T>(v: T): T {
  if (typeof v === "string") {
    return v
      .replace(/國曆/g, "西曆")
      .replace(/電子郵件/g, "電郵")
      .replace(/台灣・香港・韓國/g, "香港・台灣・韓國")
      .replace(/台北約 \+6 分、香港約 -23 分/g, "香港約 -23 分、台北約 +6 分")
      .replace(/在台灣以外出生/g, "在香港以外出生")
      .replace(/依台灣時區/g, "依香港時區") as T;
  }
  if (typeof v === "function") {
    const f = v as unknown as (...a: unknown[]) => unknown;
    return ((...a: unknown[]) => toHK(f(...a))) as T;
  }
  if (Array.isArray(v)) return v.map(toHK) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toHK(x)])) as T;
  return v;
}

const ZH_HK: SiteCopy = { ...toHK(ZH_TW), numberLocale: "zh-HK" };

const EN: SiteCopy = {
  numberLocale: "en-US",
  brand: { name: "Cheongirok", tagline: "Korean Four Pillars Reading" },
  landing: {
    slipSub: "Korean Four Pillars Reading",
    h1: "Eight characters from the moment you were born, read across a lifetime",
    heroSub:
      "Cheongirok calculates your Four Pillars (Saju, also known as BaZi) and your ten-year luck pillars precisely, and prepares a personal reading for each client. See your chart type for free first.",
    ctaGrade: "See my chart type",
    ctaPrice: "About the readings",
    trustEyebrow: "How Cheongirok works",
    trustTitle: "Not a one-size-fits-all horoscope",
    trustLead:
      "We don't write pleasant lines that fit everyone. Every reading starts from your own eight characters and is worked out step by step from classical Saju principles, backed by large-scale calculation and orthodox theory.",
    pledgeTitle: "Because this is a paid service, we promise",
    pledge: [
      "No exaggerated promises such as “guaranteed fortune” or “this will surely happen”.",
      "No unverifiable credentials, statistics or made-up reviews.",
      "Type shares, luck pillar scores, stroke counts and solar-term times in the reading are all real calculated values.",
      "We are clear that Saju is a reference for reflecting on your life, not a guarantee of the future.",
    ],
    trust: (from, to, total) => [
      {
        n: total,
        t: " charts calculated by the same rules",
        d: `Every chart that could be born between ${from} and ${to} (dates × 12 double-hours × gender) is calculated so we can show where yours stands.`,
      },
      {
        n: "To the minute",
        t: " solar terms and true solar time",
        d: "Solar-term changes such as Lichun are timed to the minute, true solar time is corrected for the longitude of your birthplace, and historical standard and daylight saving time are restored.",
      },
      {
        n: "Classical Ziping",
        t: " order of analysis",
        d: "Five Elements, Ten Gods, hidden stems, structure and favourable element, ten-year and annual luck, and months divided by solar terms form the backbone of every reading.",
      },
      {
        n: "Nothing without a basis",
        t: "",
        d: "The reading comes only from your calculated chart. No empty flattery or frightening predictions: we name the stems, branches and elements behind each point and pair weaknesses with practical remedies.",
      },
    ],
    gradeTitle: "Five types, one measure",
    gradeLead: (from, to, total) =>
      `We calculated all ${total} charts possible between ${from} and ${to} with the same rules. Element balance, luck pillar support, favourable element strength and noble stars are scored to show where you stand.`,
    gradeNote:
      "The number on the right is the share of all charts with that type. You also see how rare your day pillar, structure and favourable element combination is, whether you have the Heavenly Noble and Literary stars, and the age your peak luck pillar begins.",
    contentsTitle: "Five chapters in one booklet",
    contentsLead: "The type card, luck pillar curve, monthly luck table and the reading are bound together and saved as a PDF.",
    priceTitle: "Cheongirok readings",
    priceLead: "The full English reading is in preparation and will be announced on this page. For now you can see your Four Pillars chart and chart type for free.",
    pick: "Best",
    partsAll: "All chapters 1-5",
    partsCore: "Chapter 1 Nature · Chapter 5 Annual luck and practices",
    partsExtra: "Type card · luck curve · monthly table · booklet PDF",
    partsNaming: "5 suggested names · stroke numerology · element analysis · booklet PDF",
    productSoon: "Coming soon",
    applyCta: "Enter birth details to order",
    payPending: "Opening soon",
    steps: [
      { b: "Free chart", t: "Enter your date and time of birth to see your Four Pillars chart, chart type and rarity right away." },
      { b: "Order a reading", t: "Choose a reading, enter your name and email, and pay (the English edition is in preparation)." },
      {
        b: "Delivery",
        t: `Writing starts as soon as you pay. In about 3 minutes you can read it on screen and download it as PDF and HTML. The link stays open for ${REPORT_VALID_DAYS} days.`,
      },
    ],
    methodTitle: "How we calculate",
    method: [
      {
        dt: "Solar-term timing",
        dd: "The year and month pillars change at the exact minute of solar terms such as Lichun and Jingzhe, not at Lunar New Year or 1 January.",
      },
      {
        dt: "Your birthplace's clock history",
        dd: "The clock time on your birth record is corrected for the standard time and daylight saving time in force at the time in Korea, Taiwan, Hong Kong or mainland China.",
      },
      {
        dt: "The sun's actual position",
        dd: "The hour pillar uses true solar time from your birthplace's longitude (Seoul about -32 min, Taipei about +6 min, Hong Kong about -23 min). You can also choose how births in the Zi hour change the day.",
      },
    ],
    formTitle: "See your Four Pillars chart for free",
    formLead: "Enter your date and time of birth to see your chart and chart type. If you don't know the time, tick “Unknown” and the six characters without the hour pillar are used.",
    helpTitle: "Need help?",
    faqTitle: "Frequently asked questions",
    faq: [
      {
        q: "What if I don't know my birth time?",
        a: "We calculate with the six characters without the hour pillar. You still see your chart and type, but readings tied to the hour pillar are left out and the type is marked as based on six characters.",
      },
      {
        q: "How is the type decided?",
        a: "Element balance (30), luck pillar support (30), strength balance (15), favourable element strength (15) and the Heavenly Noble and Literary stars (10) are added up and compared with every chart possible in the same period. Schools differ, so treat it as a reference.",
      },
      { q: "Can I use my lunar birthday?", a: "Yes. You can choose the lunar calendar and leap months. If you know your solar (Gregorian) birthday, that is the most accurate." },
      {
        q: "I was born outside East Asia. Can I use it?",
        a: "The calculation currently supports births in Korea, Taiwan, Hong Kong and mainland China, using each place's historical time zone and daylight saving time.",
      },
      { q: "When can I buy the full reading?", a: "The full English reading is in preparation and will be announced on this page. Feel free to email us with any questions." },
      {
        q: "How is my information used?",
        a: "Only for the chart calculation. The AI that writes readings never receives your name, only calculated results such as stems, branches, elements and luck pillars.",
      },
    ],
    resultNotice: {
      title: "Full reading",
      text: "The full English reading (detailed chapter-by-chapter interpretation) is in preparation and will be announced on this page. Below is your calculated chart.",
    },
  },
  products: {
    core: { name: "Cheongirok Core Chart Reading", summary: "Your innate nature and element balance, with key annual and monthly luck for {Y1}-{Y2}" },
    full: { name: "Cheongirok Complete Reading", summary: "Lifetime luck pillars, wealth structure, career, love and personal luck practices" },
    naming: { name: "Lucky Name Reading", summary: "Names chosen to supply the elements missing from your chart" },
  },
  support: {
    lead: () => "For any question about entering your details or reading your results, email us and we'll reply as soon as we can.",
    kakao: "",
    kakaoFloat: "",
    kakaoFloatAria: "",
    showKakao: false,
    mail: (email) => `Email us at ${email}`,
    mailSubject: "[Cheongirok] Question",
  },
  footer: {
    linksAria: "Terms and policies",
    terms: "Terms of service (Korean)",
    lookup: "Order lookup (Korean)",
    privacy: "Privacy policy (Korean)",
    refund: "Refund policy (Korean)",
    biz: { companyName: "Company", ceo: "Representative", bizNumber: "Business registration no.", mailOrderNumber: "Mail-order business no.", address: "Address", contact: "Contact" },
    pending: "Pending",
    note: () =>
      "Charts are calculated by a calendar engine and readings are written with AI technology. This service is reference material based on Saju theory and does not guarantee the future. Operated by Cheongirok in Korea.",
    languages: "Language",
  },
  meta: {
    title: "Cheongirok — Korean Four Pillars (Saju) Reading | What is your chart type?",
    description:
      "Your Four Pillars (Saju / BaZi) calculated with minute-accurate solar terms, showing where you stand among five chart types and your lifetime luck pillars. Free to try.",
  },
};

const ALL: Record<SiteLocale, SiteCopy> = { ko: KO, "zh-TW": ZH_TW, "zh-HK": ZH_HK, en: EN };

export const siteCopy = (site: SiteLocale = "ko"): SiteCopy => ALL[site] ?? KO;
