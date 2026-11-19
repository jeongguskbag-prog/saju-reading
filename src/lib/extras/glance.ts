// 990원 맛보기 상품 "한 장 운세": 다음 해(11~1월) 또는 올해의 세운을 내 명식에 겹쳐 한 장으로 요약한다.
// AI를 쓰지 않고 계산과 정해진 문장만 쓴다(값이 싸도 남도록, 결제 직후 바로 만들 수 있도록).
// 더 자세한 풀이는 신년 운세록·숏 감정서로 이어진다.
import type { SajuChart } from "../saju/calc";
import { branchTenGod } from "../saju/gods";
import { BRANCH_KO, ELEMENT_KO, STEM_KO, type Branch, type Stem, type TenGod } from "../saju/constants";
import { computeNewyear } from "./newyear";
import type { ExtraResult, SectionsText } from "./kinds";

const YEAR_THEME: Record<TenGod, string> = {
  비견: "내 힘으로 밀고 가는 해입니다. 남에게 기대기보다 스스로 정한 계획을 꾸준히 밀고 나갈 때 성과가 납니다.",
  겁재: "경쟁과 추진의 해입니다. 의욕이 커지는 만큼 돈을 빌려주거나 보증을 서는 일은 한 번 더 생각해 보세요.",
  식신: "실력을 꾸준히 보여 주는 해입니다. 하던 일을 성실하게 이어 가면 결과가 자연스럽게 따라옵니다.",
  상관: "재능과 아이디어가 빛나는 해입니다. 새로운 시도는 좋지만, 윗사람·규칙과 부딪힐 때는 말의 온도를 낮추세요.",
  편재: "움직이는 만큼 얻는 해입니다. 활동 범위를 넓히면 기회가 들어오지만, 큰 투자는 충분히 확인한 뒤에 정하세요.",
  정재: "차곡차곡 쌓이는 해입니다. 계획한 대로 성실히 하면 그대로 남습니다. 지출을 정리하고 저축 계획을 세우기 좋습니다.",
  편관: "책임이 커지고 실력이 드러나는 해입니다. 부담스러운 일을 정면으로 해내면 인정받습니다. 무리한 일정은 줄이세요.",
  정관: "신뢰와 평판을 얻는 해입니다. 원칙을 지키는 모습이 좋게 평가받고, 공식적인 일을 진행하기 좋은 흐름입니다.",
  편인: "생각을 정리하고 기획하는 해입니다. 직관과 아이디어가 살아나 새로운 공부나 기획을 시작하기 좋습니다.",
  정인: "배우고 도움받는 해입니다. 공부·자격·문서 일에 좋은 흐름이고, 주변의 조언을 받아들이면 일이 한결 수월해집니다.",
};

const has = (gods: TenGod[], ...want: TenGod[]) => gods.some((g) => want.includes(g));

export interface GlanceComputed {
  year: number;
  ganzhi: string;
  reading: string;
  animal: string;
  score: number;
  mark: "좋음" | "보통" | "주의";
  best: number[];
  care: number[];
  samjae: string | null;
  lucky: { element: string; colors: string; numbers: string; direction: string };
}

/** 11~1월에는 다음 해(1월은 그해), 그 밖에는 올해 */
export function glanceYear(now = new Date()): number {
  const k = new Date(now.getTime() + 9 * 3_600_000);
  const y = k.getUTCFullYear();
  return k.getUTCMonth() + 1 >= 11 ? y + 1 : y;
}

export type GlanceResult = ExtraResult<Record<string, never>, GlanceComputed, SectionsText>;

export function buildGlance(chart: SajuChart, now = new Date()): GlanceResult {
  const year = glanceYear(now);
  const ny = computeNewyear(chart, year);
  const mark: GlanceComputed["mark"] = ny.score >= 60 ? "좋음" : ny.score <= 40 ? "주의" : "보통";
  const dayStem = chart.pillars.day.stem as Stem;
  const gods = [ny.stemTenGod, branchTenGod(dayStem, ny.branch as Branch)];
  const female = chart.input.gender === "female";
  const reading = STEM_KO[ny.stem] + BRANCH_KO[ny.branch];
  const monthName = (m: number) => `${m}월(${ny.months[m - 1].stem}${ny.months[m - 1].branch})`;

  const love = has(gods, ...(female ? (["정관", "편관"] as TenGod[]) : (["정재", "편재"] as TenGod[])))
    ? "배우자를 뜻하는 별이 들어오는 해라 인연이 움직이기 쉽습니다. 만남의 자리를 피하지 마세요."
    : ny.withChart.some((w) => w.label === "일지" && w.relations.some((r) => r.tone > 0))
      ? "배우자 자리(일지)와 해의 기운이 합을 이뤄 관계가 부드러워지는 해입니다."
      : ny.withChart.some((w) => w.label === "일지" && w.relations.some((r) => r.tone < 0))
        ? "배우자 자리(일지)와 해의 기운이 부딪혀 관계에 변화가 생기기 쉽습니다. 말의 온도를 챙기세요."
        : "연애운은 무난한 흐름입니다. 스스로 만드는 만남이 결실로 이어집니다.";
  const money = has(gods, "정재", "편재")
    ? "재물의 별(재성)이 들어오는 해라 돈이 움직입니다. 들어오는 만큼 새는 곳도 함께 살피세요."
    : has(gods, "비견", "겁재")
      ? "재물을 나눠 가는 기운(비겁)이 들어와 지출과 경쟁이 늘기 쉽습니다. 동업·보증은 신중하게."
      : has(gods, "식신", "상관")
        ? "재물을 만드는 힘(식상)이 들어와 내 재주로 버는 일에 좋은 해입니다."
        : "재물운은 무난한 흐름입니다. 모으는 습관을 다지기 좋습니다.";
  const work = has(gods, "정관", "편관")
    ? "직업·명예의 별(관성)이 들어오는 해라 맡는 일과 책임이 커집니다. 인정받을 기회입니다."
    : has(gods, "정인", "편인")
      ? "배움과 자격의 별(인성)이 들어와 공부·자격·문서 일에 힘이 실리는 해입니다."
      : has(gods, "상관")
        ? "표현력이 강해지는 대신 윗사람·규칙과 부딪히기 쉬운 해입니다. 결정은 문서로 남기세요."
        : "일의 흐름은 무난합니다. 하던 일을 꾸준히 다지는 데 힘을 쓰세요.";

  const summary = `${year}년 ${ny.ganzhi}(${reading})년, ${ny.animal}의 해는 내 사주에 ${ny.stemTenGod}의 기운이 들어오는 ${mark === "좋음" ? "힘이 실리는" : mark === "주의" ? "살펴 가야 할" : "무난한"} 해입니다.`;
  const flow = [YEAR_THEME[ny.stemTenGod]];
  if (ny.samjae) flow.push(`띠로 보면 ${ny.samjae}에 해당합니다. 큰 변화는 서두르지 말고 준비를 단단히 하는 것이 좋습니다.`);
  if (ny.daeun?.changes) flow.push(`이해에 대운이 ${ny.daeun.ganzhi}로 바뀝니다. 10년 흐름이 새로 시작되는 해입니다.`);
  const lucky = ny.lucky;
  return {
    kind: "glance",
    request: {},
    computed: {
      year,
      ganzhi: ny.ganzhi,
      reading,
      animal: ny.animal,
      score: ny.score,
      mark,
      best: ny.best,
      care: ny.care,
      samjae: ny.samjae,
      lucky: { element: ELEMENT_KO[ny.yongsin], colors: lucky.colors, numbers: lucky.numbers, direction: lucky.direction },
    },
    text: {
      summary,
      sections: [
        { heading: "한 해의 흐름", paragraphs: flow },
        { heading: "연애 · 재물 · 일 한 줄씩", paragraphs: [`연애 — ${love}`, `재물 — ${money}`, `일 — ${work}`] },
        {
          heading: "좋은 달과 살필 달",
          paragraphs: [
            `기운이 좋은 달: ${ny.best.map(monthName).join(", ")}. 미뤄 둔 일을 시작하거나 중요한 일을 진행하기 좋습니다.`,
            `살펴 갈 달: ${ny.care.map(monthName).join(", ")}. 큰 결정은 서두르지 말고 건강과 관계를 먼저 챙기세요.`,
          ],
        },
      ],
      advice: [
        `한 해의 행운 색은 ${lucky.colors}, 숫자는 ${lucky.numbers}, 방위는 ${lucky.direction}입니다(내 사주에 필요한 ${ELEMENT_KO[ny.yongsin]} 기운).`,
        `좋은 달(${ny.best.join("·")}월)에 중요한 약속과 시작을 몰아 두세요.`,
        "열두 달 흐름과 대운까지 자세히 보려면 신년 운세록을, 연애·재물·일 가운데 하나를 깊게 보려면 숏 감정서를 이어서 보세요.",
      ],
    },
  };
}
