// 마이 화면의 재방문 기능: 가족 사주 한눈에 보기, 1년·신년 다시 보기 안내(서버 전용, 계산만 하고 AI는 쓰지 않는다).
import type { SavedProfile } from "./member";
import type { Order } from "./orders";
import { calculateSaju, type SajuChart } from "./saju/calc";
import { BRANCH_ANIMAL, ELEMENT_KO, type Branch, type Stem } from "./saju/constants";
import { dailyFortune } from "./saju/daily";
import { branchRelation, stemRelation } from "./extras/relations";
import type { NewyearSeason } from "./season";

export interface FamilyRow {
  id: string;
  name: string;
  self: boolean;
  animal: string;
  /** 갑목(甲) */
  dayMaster: string;
  yongsin: string;
  /** 오늘의 운세 표시(좋음·보통·주의 등) */
  todayMark: string;
  todayTitle: string;
  /** 나(내 사주)와 일주(태어난 날 기둥)의 관계. 내 사주면 null */
  withMe: { tone: "good" | "care" | "mixed" | "plain"; label: string } | null;
}

function relationToMe(me: SajuChart, other: SajuChart): FamilyRow["withMe"] {
  const rel = [
    ...stemRelation(me.pillars.day.stem as Stem, other.pillars.day.stem as Stem),
    ...branchRelation(me.pillars.day.branch as Branch, other.pillars.day.branch as Branch),
  ];
  const good = rel.filter((r) => r.tone > 0);
  const bad = rel.filter((r) => r.tone < 0);
  const label = rel.map((r) => r.name).join("·");
  if (good.length && bad.length) return { tone: "mixed", label };
  if (good.length) return { tone: "good", label };
  if (bad.length) return { tone: "care", label };
  return { tone: "plain", label: label || "무난" };
}

/** 저장한 사주들을 한 표로: 띠·일간·용신·오늘 운세, 그리고 내 사주와의 일주 관계 */
export function familyRows(profiles: SavedProfile[], now = new Date()): FamilyRow[] {
  const charts = profiles.map((p) => {
    try {
      return { p, chart: calculateSaju(p.input, now) };
    } catch {
      return null;
    }
  });
  const ok = charts.filter((c): c is { p: SavedProfile; chart: SajuChart } => c !== null);
  const me = ok.find((c) => c.p.self)?.chart;
  return ok.map(({ p, chart }) => {
    const f = dailyFortune(chart, now);
    return {
      id: p.id,
      name: p.input.name?.trim() || "이름 없음",
      self: p.self,
      animal: `${BRANCH_ANIMAL[chart.pillars.year.branch as Branch]}띠`,
      dayMaster: `${chart.dayMaster.ko}${ELEMENT_KO[chart.dayMaster.element]}(${chart.dayMaster.stem})`,
      yongsin: ELEMENT_KO[chart.analysis.usefulness.yongsin],
      todayMark: f.mark,
      todayTitle: f.title,
      withMe: me && !p.self ? relationToMe(me, chart) : null,
    };
  });
}

export interface RevisitNotice {
  key: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}

const DAY = 86_400_000;

/** 1년 전 감정서·신년 시즌에 맞춰 다시 보기를 안내한다(해당하는 것만). */
export function revisitNotices(orders: Order[], season: NewyearSeason | null, now = new Date()): RevisitNotice[] {
  const out: RevisitNotice[] = [];
  const paid = orders.filter((o) => o.status === "paid" && !o.gift && !o.questionPack);
  if (season) {
    const has = paid.some((o) => o.extra?.kind === "newyear" && (o.extra.request as { year?: number } | undefined)?.year === season.year);
    if (!has) {
      out.push({
        key: "newyear",
        title: `${season.year}년 ${season.reading}년(${season.color} ${season.animal}의 해) 신년 운세`,
        text: `내 사주와 ${season.year}년 세운이 만나는 흐름을 열두 달로 풀어 드립니다. 가족 사주로도 신청할 수 있습니다.`,
        href: "/?p=newyear#saju-form",
        cta: "신년 운세록 보기",
      });
    }
  }
  const at = (o: Order) => new Date(o.paidAt ?? o.createdAt).getTime();
  const latest = paid.reduce((m, o) => Math.max(m, at(o)), 0);
  const age = latest ? (now.getTime() - latest) / DAY : 0;
  if (latest && age >= 335) {
    out.push({
      key: "anniversary",
      title: "감정서를 받으신 지 1년이 지났습니다",
      text: "타고난 명식은 그대로지만 해마다 들어오는 세운과 대운의 흐름은 달라집니다. 올해와 내년의 흐름을 새로 확인해 보세요.",
      href: "/#saju-form",
      cta: "올해 흐름 다시 보기",
    });
  }
  return out;
}
