// 대만(번체 중국어) 화면 문구. 홍콩판은 이 사전을 바탕으로 몇 단어만 바꾼다(zh-HK.ts).
import type { Messages } from "./ko";
import type { ChartNotice, InputErrorCode, BirthRegion } from "../saju/calc";
import type { Element, TenGod, Branch } from "../saju/constants";
import type { ChapterKey } from "../report-shared";
import type { ProductId } from "../product";
import { REPORT_VALID_DAYS } from "../product";

const BRAND_ZH = { name: "天機錄", tagline: "百年綜合八字" };

const TEN_GOD_ZH: Record<TenGod, string> = {
  비견: "比肩",
  겁재: "劫財",
  식신: "食神",
  상관: "傷官",
  편재: "偏財",
  정재: "正財",
  편관: "偏官",
  정관: "正官",
  편인: "偏印",
  정인: "正印",
};

const ELEMENT_ZH: Record<Element, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };

const ANIMAL_ZH: Record<Branch, string> = {
  子: "鼠", 丑: "牛", 寅: "虎", 卯: "兔", 辰: "龍", 巳: "蛇",
  午: "馬", 未: "羊", 申: "猴", 酉: "雞", 戌: "狗", 亥: "豬",
};

const pad2 = (n: number | string) => String(n).padStart(2, "0");
const utc = (minutes: number) => {
  const sign = minutes >= 0 ? "+" : "-";
  const a = Math.abs(minutes);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${pad2(a % 60)}` : ""}`;
};

const PLACE: Record<BirthRegion, string> = { KR: "首爾", TW: "台北", HK: "香港" };
const CORRECTION_MIN: Record<BirthRegion, string> = { KR: "約 -32 分", TW: "約 +6 分", HK: "約 -23 分" };

export const zhTW: Messages = {
  numberLocale: "zh-TW",
  brand: BRAND_ZH,
  client: "委託人",

  landing: {
    slipSub: "百年綜合八字",
    h1: "以出生那一刻的八個字，為您寫下百年運勢",
    heroSub:
      "開啟天機，照亮人生的羅盤。精密推算八字原局與大運流向，為每一位委託人編撰專屬鑑定書。您的八字等級，可先免費查看。",
    ctaGrade: "查看我的八字等級",
    ctaPrice: "鑑定書介紹",
    gradeTitle: "五個等級，同一把尺",
    gradeLead: (from, to, total) =>
      `我們以同一標準，計算了 ${from} 年至 ${to} 年間可能出現的全部 ${total} 組八字。將五行平衡、大運助力、用神力量與貴人化為分數，告訴您在其中的位置。`,
    gradeNote:
      "右側數字為該等級在全部八字中所佔的比例。同時告訴您：與您相同日柱・格局・用神的人是幾人中的一位、是否有天乙貴人與文昌貴人，以及大運巔峰從幾歲開始。",
    contentsTitle: "一冊收錄的五部",
    contentsLead: "等級表、大運曲線、每月運勢表與解說一同裝訂成冊，以 PDF 保存。",
    priceTitle: "天機錄 鑑定服務",
    priceLead: "繁體中文版完整鑑定書正在準備中，開放後將在此頁面公告。目前可先免費查看八字命盤與等級。",
    pick: "推薦",
    partsAll: "第一至第五部全冊",
    partsCore: "第一部 天命・第五部 流年與開運法",
    partsExtra: "等級表・大運曲線・每月運勢表・書冊式 PDF",
    productSoon: "準備中",
    applyCta: "輸入生辰後申請",
    payPending: "即將開放",
    steps: [
      { b: "免費查看", t: "輸入出生年月日時，立即顯示八字命盤、等級與稀有度。" },
      { b: "申請鑑定書", t: "選擇鑑定書，填寫姓名與電子郵件後付款（繁體中文版準備中）。" },
      {
        b: "完成通知",
        t: `付款後立即開始撰寫，完成後以電子郵件寄送鑑定書連結。連結可於 ${REPORT_VALID_DAYS} 天內開啟，並可存成 PDF。`,
      },
    ],
    methodTitle: "我們這樣推算",
    method: [
      {
        dt: "節氣時刻",
        dd: "年柱與月柱以立春、驚蟄等節氣交接的時刻為準，精確到分鐘。不是以農曆新年或 1 月 1 日為界。",
      },
      {
        dt: "出生地的時間歷史",
        dd: "依出生地（台灣・香港・韓國）當時實施的標準時間與夏令時間校正，將當年時鐘記下的出生時刻還原為正確時間。",
      },
      {
        dt: "太陽的實際位置",
        dd: "依出生地經度換算真太陽時（台北約 +6 分、香港約 -23 分）來定時柱。子時出生的換日標準也可自行選擇。",
      },
    ],
    formTitle: "免費查看八字命盤",
    formLead: "填寫出生年月日時，即可看到八字命盤與等級。不知道出生時間，請勾選「不詳」，將以去掉時柱的六個字分析。",
    helpTitle: "需要協助嗎？",
    faqTitle: "常見問題",
    faq: [
      {
        q: "不知道出生時間怎麼辦？",
        a: "會以去掉時柱的六個字計算。等級與命盤照樣可以查看，但與時柱相關的解讀會省略，等級旁也會註明「以六字計算」。",
      },
      {
        q: "等級是怎麼評定的？",
        a: "將五行平衡（30 分）、大運助力（30 分）、身強身弱的中和程度（15 分）、用神力量（15 分）、天乙・文昌貴人（10 分）相加，再與同一期間可能出生的所有八字比較。各派判斷可能不同，僅供參考。",
      },
      {
        q: "可以用農曆生日查詢嗎？",
        a: "可以。可選擇農曆與閏月。若知道國曆生日，用國曆輸入最為準確。",
      },
      {
        q: "在台灣以外出生也可以嗎？",
        a: "可以。請在「計算選項」中選擇出生地（台灣・香港・韓國），系統會依當地的時區與夏令時間計算。",
      },
      {
        q: "什麼時候可以購買完整鑑定書？",
        a: "繁體中文版完整鑑定書正在準備中，開放後會在此頁面公告。如有疑問，歡迎來信詢問。",
      },
      {
        q: "輸入的資料會用在哪裡？",
        a: "只用於八字計算。撰寫解說的 AI 不會收到您的姓名，只會收到干支・五行・大運等計算結果。",
      },
    ],
  },

  products: {
    core: { name: "天機錄 核心命盤錄", summary: "先天本質與五行平衡，{Y1}～{Y2} 流年與每月運勢重點分析" },
    full: { name: "天機錄 綜合鑑定書", summary: "一生大運走向、先天財富格局、事業運、姻緣運、專屬開運法" },
    naming: { name: "吉運開運命名錄", summary: "補足八字所缺五行，依數理與字義五行量身取名・改名" },
  } as Record<ProductId, { name: string; summary: string }>,

  form: {
    name: "委託人姓名（選填）",
    namePlaceholder: "王小明",
    gender: "性別",
    female: "女性（坤命）",
    male: "男性（乾命）",
    birthDate: "出生年月日",
    calendarAria: "國曆或農曆",
    solar: "國曆",
    lunar: "農曆",
    monthAria: "月",
    month: (m) => `${m} 月`,
    dayAria: "日",
    day: (d) => `${d} 日`,
    leapMonth: "閏月",
    birthTime: "出生時間",
    hourAria: "時",
    hour: (h) => `${h} 時`,
    minuteAria: "分",
    minute: (m) => `${m} 分`,
    unknown: "不詳",
    showRegion: true,
    region: "出生地",
    regions: { TW: "台灣", HK: "香港", KR: "韓國" } as Record<BirthRegion, string>,
    advanced: "計算選項",
    solarCorrection: (region) => `真太陽時校正（以${PLACE[region]}為準，${CORRECTION_MIN[region]}）`,
    dayBoundary: "子時（23～01 時）出生的日柱標準",
    dayBoundaryAria: "子時日柱標準",
    at23: "23 時換日",
    at0: "午夜換日（夜子時）",
    submit: "查看八字",
    submitting: "計算中…",
    yearAria: "年",
    yearPick: "從年份清單選擇",
    yearPickPlaceholder: "選擇年份",
    yearOption: (y) => `${y} 年`,
    requestFailed: "請求失敗，請稍後再試。",
  },

  errors: {
    year4: "年份請輸入四位數字（例：1990）。",
    before1900: "只能計算 1900 年以後的日期。",
    input: (code: InputErrorCode, p: Record<string, number>) =>
      ({
        yearRange: "年份請輸入 1900～2100 之間。",
        solarDate: "此國曆日期不存在。",
        leapMonth: `${p.year} 年農曆沒有閏 ${p.month} 月。`,
        lunarDate: "此農曆日期不存在。",
        future: "出生日期晚於今天，請再確認一次。",
        hourRange: "時請輸入 0～23。",
        minuteRange: "分請輸入 0～59。",
      })[code],
    future: "出生日期晚於今天，請再確認一次。",
  },

  grade: {
    title: "我的八字等級",
    seal: (level) => `${level} 等`,
    sealAria: (level) => `${level} 等印章`,
    tiers: {
      1: { name: "天賦福祿之命", desc: "原局平衡、用神有力、大運相助，三者兼備的罕見格局。" },
      2: { name: "氣勢鮮明之命", desc: "優勢明確，而且大運推動這份優勢的格局。" },
      3: { name: "均衡穩健之命", desc: "偏頗較少，擅長穩步累積的格局。" },
      4: { name: "逢時而起之命", desc: "當大運補足原局的空缺時，便能大展身手的格局。" },
      5: { name: "自闢蹊徑之命", desc: "偏旺之氣明顯，懂得駕馭便能化為個人特色的格局。" },
    },
    top: "前",
    points: (score) => `${score} 分／100`,
    ladderAria: "五個等級",
    level: (level) => `${level} 等`,
    me: "◀ 我",
    sameCombo: "與我相同的八字組合",
    oneIn: (n) => `${n} 人中 1 人`,
    peak: "大運巔峰期",
    ageRange: (a, b) => `${a}～${b} 歲`,
    peakSub: (ganzhi, score) => `${ganzhi} 大運・用神契合度 ${score}`,
    nobles: { 천을귀인: "天乙貴人", 문창귀인: "文昌貴人" },
    has: "有",
    none: "無",
    nobleShare: (p) => `全部八字中 ${p}% 擁有此貴人`,
    basisTitle: "等級依據",
    parts: { balance: "五行平衡", daeun: "大運助力", harmony: "身強身弱中和", yongsin: "用神力量", noble: "貴人" },
    footnote: (from, to, total) =>
      `以同一標準計算 ${from}～${to} 年間可能出生的全部 ${total} 組八字（日期 × 12 時辰 × 性別）後比較得出的相對等級。將五行平衡、大運助力、中和、用神、貴人量化評分；各派判斷可能不同，僅供參考。`,
    partial: " 因出生時間不詳，以去掉時柱的六個字計算。",
    rarityLabel: (dayPillar, gyeokguk, yongsin) => `${dayPillar}日柱・${gyeokguk}・用神${yongsin}`,
  },

  chart: {
    tenGod: TEN_GOD_ZH,
    gyeokguk: (god) => (god === "비견" ? "建祿格" : god === "겁재" ? "羊刃格" : `${TEN_GOD_ZH[god]}格`),
    gyeokgukBasis: (monthBranch, stem, revealed) =>
      revealed ? `月支${monthBranch}所藏的${stem}透出天干` : `以月支${monthBranch}的本氣${stem}為準`,
    element: ELEMENT_ZH,
    elementShort: (e) => ELEMENT_ZH[e],
    glyphReading: (_ko, e) => ELEMENT_ZH[e],
    pillarLabels: { hour: "時柱", day: "日柱", month: "月柱", year: "年柱" },
    unknown: "不詳",
    dayMaster: "日主（我）",
    hiddenStems: "藏干",
    pillarsTitle: (name) => (name ? `${name} 的八字命盤` : "八字命盤"),
    solar: "國曆",
    lunar: "農曆",
    lunarDate: (l) => `${l.year} 年 ${l.leap ? "閏" : ""}${l.month} 月 ${l.day} 日`,
    dayStem: "日主",
    zodiacLabel: "生肖",
    zodiac: (b) => ANIMAL_ZH[b],
    strengthLabel: "身強身弱",
    strength: { 극신약: "極身弱", 신약: "身弱", 중화: "中和", 신강: "身強", 극신강: "極身強" },
    strengthRef: (score) => `（參考 ${score} 分）`,
    timeNote: (t) =>
      t.corrected ? `已校正真太陽時：${t.local}（東經 ${t.longitude}° 為準）` : `以標準時間（${utc(t.standardOffset)}）計算：${t.local.slice(11)}`,
    notice: (n: ChartNotice) => {
      switch (n.code) {
        case "kst1954":
          return "已反映韓國 1954～1961 年的標準時間（UTC+8:30）。";
        case "kstDst":
          return "已反映韓國 1987～1988 年的夏令時間（1 小時）。";
        case "zoneShift":
          return `已反映出生當時實施的時間（${utc(n.offsetMinutes)}，含夏令時間等）。`;
        case "timeUnknown":
          return "因出生時間不詳，以去掉時柱的六個字分析。";
        case "jieBoundary":
          return "出生日前後正逢節氣交接，月柱（或年柱）可能因出生時間而不同。";
        case "lunarLib":
          return "農曆換算依中國農曆標準，與韓國農曆偶有一日之差。";
      }
    },
    elementTitle: "五行平衡",
    donutAria: "五行比重圓餅圖",
    donutSub: (e) => `日主 ${ELEMENT_ZH[e]}`,
    legend: (pct, count) => `${pct}%・${count} 字`,
    elementNote: "比重以藏干分配後的加權分數計算，字數則以外顯的八個（或六個）字計算。",
    missing: (list) => ` 原局缺少的五行：${list}。`,
    listSep: "、",
    analysisTitle: "格局與參考用神",
    gyeokgukLabel: "格局",
    yongsin: "參考用神",
    yongsinSub: "平衡人生的力量",
    huisin: "喜神",
    huisinSub: "幫助用神的力量",
    gisin: "忌神",
    gisinSub: "需要調節的力量",
    method: (basis) =>
      ({
        weak: "扶抑・平衡法：身弱，取幫助日主的五行（印星・比劫）中較不足者",
        strong: "扶抑・平衡法：身強，取洩耗日主的五行（食傷・財星・官星）中較不足者",
        balanced: "扶抑・平衡法：接近中和，取原局中最不足的五行",
      })[basis],
    schoolNote: "各派判斷可能不同，僅供參考。",
    tenGodTitle: "我的十神，用現代語言解讀",
    tenGodHead: ["十神", "個數", "現代解讀"],
    tenGodModern: {
      비견: "獨立心與自主性",
      겁재: "競爭心與強大的推進力",
      식신: "專業能力與穩定的產出力",
      상관: "創意表達力與個人品牌天賦",
      편재: "專案型創收能力與投資眼光",
      정재: "穩健的資產管理與踏實累積",
      편관: "危機應變力與突破型領導力",
      정관: "原則與責任感、組織適應力",
      편인: "專業企劃力與獨到的直覺",
      정인: "學習力與包容力、贏得信任的力量",
    },
    curveAria: "十年大運走勢圖",
    curveAxis: { 100: "順風", 50: "平穩", 0: "謹慎" },
    current: "目前",
    peak: "巔峰期",
    age: (a) => `${a} 歲`,
    curvePoint: (age, gz, score) => `${age} 歲 ${gz}・契合度 ${score}`,
    daeunTitle: "十年大運走勢",
    daeunSub: (forward, start) => `（${forward ? "順行" : "逆行"}，${start} 歲起運）`,
    daeunNote: (yongsin) => `曲線表示各步大運與參考用神（${yongsin}）的契合程度，僅供參考。`,
    luckReading: () => "",
    yearFlowTitle: (y1, y2) => `${y1}－${y2} 流年與每月運勢`,
    year: (y) => `${y} 年`,
    yearScore: (s) => `用神契合度 ${s}/100`,
    monthTitle: (y) => `${y} 年每月運勢`,
    monthHead: ["交節日", "月", "關鍵字（十神）", "運勢"],
    mark: { 좋음: "順", 보통: "平", 주의: "慎" },
    monthNote: "月份以節氣（交節日）為界。運勢標示依與參考用神的契合度判定。",
    luckyTitle: "幸運顏色・數字・方位",
    luckyElement: "幸運五行",
    colors: "顏色",
    numbers: "數字",
    direction: "方位",
    habits: "有幫助的習慣",
    lucky: {
      wood: { colors: "綠色・青綠色", numbers: "3、8", direction: "東方", habits: "晨間散步、照顧植物、開始新的學習" },
      fire: { colors: "紅色・橙色・紫色", numbers: "2、7", direction: "南方", habits: "曬太陽、與人交流、演講與表達活動" },
      earth: { colors: "黃色・土黃色・米色", numbers: "5、10", direction: "中央（住家・辦公室中心）", habits: "規律飲食、整理行程、儲蓄習慣" },
      metal: { colors: "白色・銀色・金色", numbers: "4、9", direction: "西方", habits: "整理收納、呼吸練習、建立原則" },
      water: { colors: "黑色・深藍色", numbers: "1、6", direction: "北方", habits: "充足睡眠、閱讀與冥想、多喝水" },
    },
  },

  chapters: {
    part1: {
      label: "Part 1",
      title: "我的天命",
      lead: "觀察先天的氣質、格局與五行平衡。",
      sections: ["從日主看先天性格", "格局與用神：人生的中心軸", "五行平衡與補強策略"],
    },
    part2: {
      label: "Part 2",
      title: "財富與事業",
      lead: "觀察金錢進出與停留的方式，以及工作的適性。",
      sections: ["現金流模式與財富格局", "上班型 vs 創業型適合度", "風險管理與招財開運法"],
    },
    part3: {
      label: "Part 3",
      title: "感情與姻緣運",
      lead: "觀察愛人的方式與緣分的紋理。",
      sections: ["感情傾向與配偶宮（日支）解讀", "幫助我的貴人特徵", "關係改善建議"],
    },
    part4: {
      label: "Part 4",
      title: "十年大運走勢",
      lead: "以十年為單位，觀察人生的大方向與轉折點。",
      sections: ["一眼看懂大運走勢", "目前大運的課題", "人生巔峰時機與轉折點指南"],
    },
    part5: {
      label: "Part 5",
      title: "{Y1}－{Y2} 流年與開運法",
      lead: "整理最近兩年的運勢與生活中的開運法。",
      sections: ["{Y1} 年整體運勢", "{Y2} 年整體運勢", "如何善用每月運勢", "健康管理重點", "幸運顏色・數字・方位的運用"],
    },
  } as Record<ChapterKey, { label: string; title: string; lead: string; sections: string[] }>,

  report: {
    preface: "序",
    toc: "目錄",
    methodTitle: "鑑定書撰寫方式與聲明",
    noReadingTitle: "完整鑑定書",
    noReading: "繁體中文版完整鑑定書（各部詳細解說）正在準備中。以下為命盤計算結果。",
    writing: (label) => `正在撰寫 ${label} 解說，約需 1～2 分鐘。`,
    retry: "重新撰寫此部分",
    actionPlan: "開運實踐法",
    watermark: (brand, name) => `${brand}・${name} 專屬鑑定書・禁止擅自複製與散布`,
    coverSub: "一對一專屬八字精密鑑定書",
    coverTagline: ["解讀上天為您安排的格局與時機", "照亮人生轉折點的智慧羅盤"],
    coverName: (name) => name,
    pillarsAria: "八字（時・日・月・年）",
    coverBirthLabel: "出生",
    coverBirth: (p) =>
      `${p.lunar ? `農曆 ${p.lunarText}（國曆 ${p.y}.${p.m}.${p.d}）` : `${p.y} 年 ${p.m} 月 ${p.d} 日（國曆）`} ${p.hourBranch ? `${p.hourBranch}時` : "出生時間不詳"}`,
    issued: (date, brand) => `發行日期 ${date.y} 年 ${pad2(date.m)} 月 ${pad2(date.d)} 日・${brand} 命運研究院 敬呈`,
    coverFoot: "委託人本人閱覽之機密文件・Strictly Confidential & Personal",
    sealTitle: (brand) => `${brand} 印`,
    issueOffset: 480,
  },

  methodBox: {
    title: "鑑定書撰寫方式與聲明",
    basis: (timeKnown, corrected) =>
      timeKnown ? (corrected ? "反映節氣時刻與真太陽時的" : "反映節氣時刻的") : "反映節氣時刻（出生時間不詳，未含時柱）的",
    calcLabel: "命盤推算：",
    calc: (basis) => `以${basis}精密萬年曆引擎，計算八字・五行・十神・大運・格局、參考用神與每月運勢。`,
    aiLabel: "解說撰寫：",
    ai: "由最新的付費 AI 模型（Anthropic Claude）依據上述命盤撰寫。",
    disclaimerLabel: "免責聲明：",
    disclaimer:
      "本鑑定書為根據命理學理論的參考資料，不保證未來。不能取代醫療・法律・財務等專業判斷；參考本鑑定書所做的選擇及其結果，由委託人自行負責。",
    useLabel: "使用範圍：",
    use: (name) => `本鑑定書僅供 ${name} 個人閱覽，禁止擅自複製・散布・販售。`,
  },

  actions: {
    pdf: "存成 PDF",
    html: "存成 HTML",
    busy: "解說完成後，可連同解說一起儲存。",
    hint: "PDF 請在列印畫面選擇「儲存為 PDF」。無法開啟 PDF 的人，可改傳 HTML 檔（用瀏覽器開啟）。",
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
    privacy: "隱私權政策（韓文）",
    refund: "退款規定（韓文）",
    biz: {
      companyName: "公司名稱",
      ceo: "負責人",
      bizNumber: "營業登記號碼",
      mailOrderNumber: "通訊銷售業申報",
      address: "地址",
      contact: "客服",
    },
    pending: "登記中",
    note: () =>
      "命盤由萬年曆計算引擎推算，解說文字由 AI（Claude）撰寫。本服務為根據命理學理論的參考資料，不保證未來。本服務由韓國的天機錄營運。",
    languages: "語言",
  },

  meta: {
    title: "天機錄 — 百年綜合八字｜我的八字是第幾等？",
    description: "以精確到分鐘的節氣萬年曆排出八字，告訴您在五個等級中的位置與百年大運走勢。依台灣時區與夏令時間計算，可免費查看。",
  },
};
