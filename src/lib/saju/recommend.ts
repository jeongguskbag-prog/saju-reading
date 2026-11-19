// 무료 결과 아래 '내 사주 맞춤 추천': 무료로 보여 준 명식에서 눈에 띄는 점을 근거로 감정서 1~2개를 골라 이유와 함께 보여 준다.
// 계산만 쓰고 AI는 쓰지 않는다(브라우저에서도 돈다). 근거는 실제 계산값에서만 뽑고, 효과를 약속하는 말은 쓰지 않는다.
import type { SajuChart } from "./calc";
import { branchTenGod, tenGod, yearGanZhi } from "./gods";
import type { Branch, Stem, TenGod } from "./constants";
import type { ProductId } from "../product";

export interface Recommendation {
  product: ProductId;
  /** 카드 제목: 사주에서 눈에 띄는 점 */
  title: string;
  /** 왜 이 감정서인지(계산 근거) */
  reason: string;
}

/** 삼합 무리별 도화(桃花) 지지 */
const PEACH: [string, Branch][] = [
  ["申子辰", "酉"],
  ["寅午戌", "卯"],
  ["巳酉丑", "午"],
  ["亥卯未", "子"],
];
const peachOf = (b: Branch): Branch => PEACH.find(([k]) => k.includes(b))![1];

const count = (chart: SajuChart, gods: TenGod[]) => gods.reduce((s, g) => s + (chart.tenGodCounts[g] ?? 0), 0);

/** 한국 시간 기준 연·월 */
function kst(now: Date) {
  const k = new Date(now.getTime() + 9 * 3_600_000);
  return { year: k.getUTCFullYear(), month: k.getUTCMonth() + 1 };
}

export function recommendFor(chart: SajuChart, now = new Date(), available?: ProductId[]): Recommendation[] {
  const ok = (id: ProductId) => !available || available.includes(id);
  const out: Recommendation[] = [];
  const add = (r: Recommendation) => {
    if (ok(r.product) && !out.some((x) => x.product === r.product)) out.push(r);
  };
  const dayStem = chart.pillars.day.stem as Stem;
  const dayBranch = chart.pillars.day.branch as Branch;
  const female = chart.input.gender === "female";
  const spouseGods: TenGod[] = female ? ["정관", "편관"] : ["정재", "편재"];
  const spouseName = female ? "관성(官星)" : "재성(財星)";
  const { year, month } = kst(now);
  const marital = chart.input.life?.marital;

  // 1) 연애·인연: 앞으로 두 해(11·12월이면 올해 대신 내년부터) 세운에 배우자성이나 도화가 들어오는지
  const peach = [peachOf(chart.pillars.year.branch as Branch), peachOf(dayBranch)];
  const loveYears: string[] = [];
  const from = month >= 11 ? year + 1 : year;
  for (const y of [from, from + 1]) {
    const [s, b] = yearGanZhi(y) as [Stem, Branch];
    if (spouseGods.includes(tenGod(dayStem, s)) || spouseGods.includes(branchTenGod(dayStem, b)) || peach.includes(b)) loveYears.push(`${y}년`);
  }
  if (marital === "married") {
    add({
      product: "gunghap",
      title: "두 분의 합과 충을 함께 볼 때",
      reason: "결혼하셨다고 알려 주셨습니다. 배우자분 생년월일시와 함께 일간·배우자 자리·띠의 합충과 대운 흐름을 나란히 놓고 봅니다.",
    });
  } else if (loveYears.length) {
    add({
      product: "love",
      title: `${loveYears.join("·")}에 인연의 기운이 들어옵니다`,
      reason: `세운에 배우자성 ${spouseName}이나 도화(桃花)가 들어오는 해입니다. 인연이 드는 달과 잘 맞는 상대의 성향을 짧게 짚어 드립니다.`,
    });
  }

  // 2) 재물: 재성이 많거나(3개 이상) 하나도 없을 때
  const wealth = count(chart, ["정재", "편재"]);
  if (wealth >= 3 || wealth === 0) {
    add({
      product: "full",
      title: wealth >= 3 ? "재성(財星)이 많은 사주입니다" : "재성(財星)이 드러나지 않은 사주입니다",
      reason:
        wealth >= 3
          ? `명식에 재성이 ${wealth}개 있습니다. 돈이 들어오는 길과 새는 길, 대운별 재물 흐름을 종합 감정서에서 자세히 봅니다.`
          : "명식에 재성이 보이지 않습니다. 재물을 어떻게 만들고 지키는지, 대운에서 재성이 들어오는 때를 종합 감정서에서 봅니다.",
    });
  }

  // 3) 직업·명예: 관성이 많을 때
  const career = count(chart, ["정관", "편관"]);
  if (career >= 3) {
    add({
      product: "core",
      title: "관성(官星)이 강한 사주입니다",
      reason: `명식에 관성이 ${career}개 있습니다. 조직·책임·평판과 맞는 일, 지금 대운에서 일이 풀리는 방향을 핵심 명식록에서 짚어 드립니다.`,
    });
  }

  // 4) 연말·연초에는 다음 해 신년 운세
  if (month >= 11 || month <= 1) {
    const target = month >= 11 ? year + 1 : year;
    add({
      product: "newyear",
      title: `${target}년, 내 명식에 어떤 해가 들어오는지`,
      reason: `${target}년 세운이 내 일간과 대운에 들어오는 모습, 삼재 여부와 열두 달 월운을 정리해 드립니다.`,
    });
  }

  // 근거가 하나도 없으면 기본 감정서
  if (!out.length) {
    add({
      product: "core",
      title: "타고난 명식부터 정확하게",
      reason: "일간·격국·용신과 지금 대운을 바탕으로 성향과 일·재물·관계의 흐름을 정리해 드립니다.",
    });
  }
  return out.slice(0, 2);
}
