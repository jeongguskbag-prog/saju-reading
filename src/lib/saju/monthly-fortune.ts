// 이달의 운세와 길일 달력(회원 혜택, 서버 전용). AI를 쓰지 않고 만세력 계산만 쓴다.
// - 이달의 운세: 그달(양력 달의 20일이 속한 절기 달)의 월건 간지가 내 일간에게 어떤 십신인지 + 용신 부합도
// - 길일 달력: 날마다 일진의 용신 부합도와 내 일지와의 합충으로 좋음·보통·주의, 목적을 고르면 택일 계산으로 길일·피할 날 표시
import { Solar } from "lunar-javascript";
import type { SajuChart } from "./calc";
import { branchElementOf, ganzhiScore, markOf, monthlyFlow, type MonthFlow } from "./analysis";
import { BRANCH_KO, STEM_ELEMENT, STEM_KO, type Branch, type Stem, type TenGod } from "./constants";
import { splitGanZhi } from "./gods";
import { branchRelation } from "../extras/relations";
import { computeTaekil } from "../extras/taekil";
import { TAEKIL_PURPOSES, type TaekilPurpose } from "../extras/requests";

const MONTH_THEME: Record<TenGod, { title: string; text: string }> = {
  비견: { title: "내 힘으로 밀고 가는 달", text: "남에게 기대기보다 스스로 정한 계획을 밀고 나갈 때 성과가 납니다. 동료·친구와는 협력하되 역할과 몫을 분명히 해 두세요." },
  겁재: { title: "경쟁 속에 기회가 있는 달", text: "의욕과 추진력이 커지는 달입니다. 경쟁에서 앞서기 좋지만, 돈을 빌려주거나 보증을 서는 일은 피하는 것이 좋습니다." },
  식신: { title: "실력을 꾸준히 보여 주는 달", text: "하던 일을 성실하게 이어 가면 결과가 자연스럽게 따라옵니다. 건강한 생활 리듬과 여유가 운을 받쳐 줍니다." },
  상관: { title: "재능과 아이디어가 빛나는 달", text: "표현력과 창의력이 살아납니다. 새로운 시도를 해 보기 좋지만, 윗사람·규칙과의 마찰은 말의 온도를 낮춰 피하세요." },
  편재: { title: "움직이는 만큼 얻는 달", text: "새로운 사람과 기회가 들어오기 쉽습니다. 활동 범위를 넓히면 수입의 길이 열리지만, 큰 투자는 충분히 확인한 뒤에 결정하세요." },
  정재: { title: "차곡차곡 쌓이는 달", text: "계획한 대로 성실히 하면 그대로 남는 달입니다. 지출을 정리하고 저축·재무 계획을 세우기에 알맞습니다." },
  편관: { title: "책임이 커지고 실력이 드러나는 달", text: "부담스러운 일이 몰릴 수 있지만 정면으로 해내면 인정받습니다. 무리한 일정은 줄이고 컨디션을 챙기세요." },
  정관: { title: "신뢰와 평판을 얻는 달", text: "원칙을 지키는 모습이 좋게 평가받습니다. 승진·계약·공식적인 일을 진행하기 좋은 흐름입니다." },
  편인: { title: "생각을 정리하고 기획하는 달", text: "직관과 아이디어가 살아나는 달입니다. 새로운 공부나 기획을 시작하기 좋고, 생각이 많아질 때는 몸을 움직여 보세요." },
  정인: { title: "배우고 도움받는 달", text: "공부·자격·문서 일에 좋은 흐름입니다. 주변의 도움과 조언을 받아들이면 일이 한결 수월해집니다." },
};

const TONE: Record<MonthFlow["mark"], string> = {
  좋음: "이달의 기운이 내 사주의 균형을 돕습니다. 미뤄 둔 일을 시작하거나 중요한 일을 진행하기 좋습니다.",
  보통: "이달의 기운은 무난합니다. 큰 변화보다는 하던 일을 꾸준히 다지는 데 힘을 쓰세요.",
  주의: "이달의 기운이 내 사주와 다소 엇갈립니다. 큰 결정은 서두르지 말고, 건강과 인간관계를 먼저 챙기세요.",
};

export interface MonthFortune {
  year: number;
  month: number;
  ganzhi: string;
  reading: string;
  god: TenGod;
  score: number;
  mark: MonthFlow["mark"];
  title: string;
  text: string;
  tone: string;
}

/** 양력 year년 month월의 운세(그달 20일이 속한 절기 달 기준) */
export function monthFortune(chart: SajuChart, year: number, month: number): MonthFortune {
  const m = monthlyFlow(year, chart.pillars.day.stem, chart.analysis.usefulness)[month - 1];
  const theme = MONTH_THEME[m.stemTenGod];
  return {
    year,
    month,
    ganzhi: m.stem + m.branch,
    reading: STEM_KO[m.stem as Stem] + BRANCH_KO[m.branch as Branch],
    god: m.stemTenGod,
    score: m.score,
    mark: m.mark,
    title: theme.title,
    text: theme.text,
    tone: TONE[m.mark],
  };
}

export interface CalendarDay {
  date: string;
  day: number;
  weekday: number;
  ganzhi: string;
  mark: MonthFlow["mark"];
  /** 목적을 골랐을 때: 추천 길일 / 피할 날 */
  pick?: boolean;
  avoid?: string | null;
}

export interface MonthCalendar {
  year: number;
  month: number;
  purpose: TaekilPurpose | null;
  purposeLabel: string | null;
  days: CalendarDay[];
}

const p2 = (n: number) => String(n).padStart(2, "0");

/** 한 달 달력: 날마다 좋음·보통·주의. 목적(이사·계약 등)을 고르면 택일 계산으로 길일·피할 날을 함께 표시한다. */
export function monthCalendar(chart: SajuChart, year: number, month: number, purpose: TaekilPurpose | null = null): MonthCalendar {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const u = chart.analysis.usefulness;
  const dayBranch = chart.pillars.day.branch as Branch;
  const taekil = purpose ? computeTaekil(chart, { purpose, start: `${year}-${p2(month)}-01`, end: `${year}-${p2(month)}-${p2(last)}` }) : null;
  const days: CalendarDay[] = [];
  for (let d = 1; d <= last; d++) {
    const date = `${year}-${p2(month)}-${p2(d)}`;
    const gz = Solar.fromYmd(year, month, d).getLunar().getDayInGanZhi();
    const [s, b] = splitGanZhi(gz) as [Stem, Branch];
    let score = ganzhiScore(STEM_ELEMENT[s], branchElementOf(b), u);
    const rel = branchRelation(b, dayBranch);
    if (rel.some((r) => r.name === "충")) score -= 20;
    if (rel.some((r) => r.name === "육합" || r.name.startsWith("삼합"))) score += 8;
    const t = taekil?.days.find((x) => x.date === date);
    days.push({
      date,
      day: d,
      weekday: new Date(Date.UTC(year, month - 1, d)).getUTCDay(),
      ganzhi: gz,
      mark: markOf(Math.max(0, Math.min(100, score))),
      ...(taekil ? { pick: taekil.picks.includes(date), avoid: t?.excluded ?? null } : {}),
    });
  }
  return { year, month, purpose, purposeLabel: purpose ? TAEKIL_PURPOSES[purpose] : null, days };
}

export const CALENDAR_PURPOSES = TAEKIL_PURPOSES;
export const isPurpose = (v: unknown): v is TaekilPurpose => typeof v === "string" && v in TAEKIL_PURPOSES;
