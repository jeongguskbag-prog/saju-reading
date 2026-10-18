// 오늘의 운세(회원 혜택). AI를 쓰지 않고, 오늘 일진(日辰)과 내 명식의 관계로 정한다.
// - 일진 천간이 내 일간에게 어떤 십신인지 → 오늘의 테마
// - 일진이 참고 용신과 얼마나 맞는지(월별 흐름과 같은 점수) → 좋음·보통·주의
import { Solar } from "lunar-javascript";
import { BRANCH_KO, ELEMENT_KO, STEM_ELEMENT, STEM_KO, type TenGod } from "./constants";
import { branchElementOf, ganzhiScore, LUCKY_BY_ELEMENT, markOf, type MonthFlow } from "./analysis";
import { splitGanZhi, tenGod } from "./gods";
import type { SajuChart } from "./calc";

const THEME: Record<TenGod, { title: string; text: string }> = {
  비견: { title: "내 페이스를 지키는 날", text: "남의 속도에 맞추기보다 스스로 정한 순서대로 움직일 때 일이 잘 풀립니다. 혼자 끝낼 수 있는 일을 먼저 처리해 보세요." },
  겁재: { title: "경쟁과 추진의 날", text: "의욕이 앞서는 날입니다. 밀어붙일 일은 밀어붙이되, 돈 거래나 즉흥적인 약속은 한 번 더 생각해 보세요." },
  식신: { title: "꾸준히 만들어 내는 날", text: "손에 익은 일을 차분히 해내기 좋습니다. 맛있는 식사와 충분한 휴식이 다음 일의 힘이 됩니다." },
  상관: { title: "표현이 빛나는 날", text: "아이디어와 말솜씨가 살아납니다. 다만 윗사람이나 규칙과 부딪히지 않도록 말의 온도를 한 번 조절해 보세요." },
  편재: { title: "기회를 잡는 날", text: "새로운 사람과 제안이 들어오기 쉬운 날입니다. 움직이는 만큼 얻지만, 큰돈이 드는 결정은 오늘 확정하지 않는 편이 안전합니다." },
  정재: { title: "차곡차곡 쌓는 날", text: "계획한 일을 성실히 처리하면 그대로 결과가 남습니다. 지출을 정리하거나 저축을 챙기기에 알맞습니다." },
  편관: { title: "책임과 결단의 날", text: "부담스러운 일이 몰릴 수 있지만, 피하지 않고 맞서면 실력을 보여 줄 기회가 됩니다. 무리한 일정은 줄이세요." },
  정관: { title: "신뢰를 얻는 날", text: "원칙을 지키는 모습이 좋게 평가받습니다. 공식적인 일, 서류, 약속을 처리하기 좋은 날입니다." },
  편인: { title: "직관이 살아나는 날", text: "남다른 생각과 기획이 떠오릅니다. 메모해 두고, 생각이 많아질 때는 몸을 움직여 머리를 비워 보세요." },
  정인: { title: "배우고 도움받는 날", text: "공부와 정리에 집중이 잘 됩니다. 도움을 청하면 기꺼이 손을 내미는 사람이 있으니 혼자 끙끙대지 마세요." },
};

const TONE: Record<MonthFlow["mark"], string> = {
  좋음: "오늘의 기운이 내 사주의 균형을 돕습니다. 미뤄 둔 일을 시작하기 좋습니다.",
  보통: "오늘의 기운은 무난합니다. 평소 하던 대로 꾸준히 이어 가세요.",
  주의: "오늘의 기운이 내 사주와 다소 엇갈립니다. 중요한 결정은 서두르지 말고 컨디션을 먼저 챙기세요.",
};

export interface DailyFortune {
  /** YYYY-MM-DD(한국 날짜) */
  date: string;
  ganzhi: string;
  reading: string;
  god: TenGod;
  score: number;
  mark: MonthFlow["mark"];
  title: string;
  text: string;
  tone: string;
  lucky: { element: string; colors: string; numbers: string; direction: string };
}

/** 한국 날짜 기준 오늘의 운세 */
export function dailyFortune(chart: SajuChart, now = new Date()): DailyFortune {
  const k = new Date(now.getTime() + 9 * 3_600_000);
  const [y, m, d] = [k.getUTCFullYear(), k.getUTCMonth() + 1, k.getUTCDate()];
  const gz = Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi();
  const [stem, branch] = splitGanZhi(gz);
  const u = chart.analysis.usefulness;
  const score = ganzhiScore(STEM_ELEMENT[stem], branchElementOf(branch), u);
  const mark = markOf(score);
  const god = tenGod(chart.dayMaster.stem, stem);
  const lucky = LUCKY_BY_ELEMENT[u.yongsin];
  return {
    date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    ganzhi: gz,
    reading: STEM_KO[stem] + BRANCH_KO[branch],
    god,
    score,
    mark,
    ...THEME[god],
    tone: TONE[mark],
    lucky: { element: ELEMENT_KO[u.yongsin], colors: lucky.colors, numbers: lucky.numbers, direction: lucky.direction },
  };
}
