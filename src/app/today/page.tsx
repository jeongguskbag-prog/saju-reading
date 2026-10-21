import type { Metadata } from "next";
import { Solar } from "lunar-javascript";
import SiteShell from "@/components/SiteShell";
import { BRANCHES, BRANCH_ANIMAL, BRANCH_ELEMENT, BRANCH_KO, ELEMENT_KO, STEM_ELEMENT, STEM_KO, type Branch } from "@/lib/saju/constants";
import { splitGanZhi } from "@/lib/saju/gods";
import { branchRelation } from "@/lib/extras/relations";
import { BRAND } from "@/lib/product";

export const revalidate = 3600;

const kstToday = () => {
  const k = new Date(Date.now() + 9 * 3_600_000);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate(), w: k.getUTCDay() };
};

export async function generateMetadata(): Promise<Metadata> {
  const { y, m, d } = kstToday();
  return {
    title: `오늘의 일진·띠별 운세 ${y}년 ${m}월 ${d}일 — ${BRAND.name}`,
    description: `${y}년 ${m}월 ${d}일 오늘의 일진(日辰)과 열두 띠별로 오늘 일진과의 합·충 관계를 만세력으로 계산해 알려 드립니다.`,
    alternates: { canonical: "/today" },
  };
}

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/** 띠(태어난 해의 지지)와 오늘 일진 지지의 관계를 한 줄로 */
function lineFor(birth: Branch, day: Branch): { tone: "good" | "care" | "plain"; label: string; text: string } {
  const rel = branchRelation(birth, day);
  const good = rel.filter((r) => r.tone > 0).map((r) => r.name);
  const bad = rel.filter((r) => r.tone < 0).map((r) => r.name);
  if (good.length && !bad.length) return { tone: "good", label: good.join("·"), text: "오늘의 기운과 손발이 맞는 날입니다. 사람을 만나고 일을 시작하기 좋습니다." };
  if (bad.length && !good.length)
    return { tone: "care", label: bad.join("·"), text: "오늘의 기운과 부딪히기 쉬운 날입니다. 말과 일정을 한 번 더 살피고 무리한 결정은 미루세요." };
  if (good.length && bad.length) return { tone: "plain", label: [...good, ...bad].join("·"), text: "돕는 기운과 부딪히는 기운이 함께 있습니다. 서두르지 않으면 무난합니다." };
  if (birth === day) return { tone: "plain", label: "같은 지지", text: "내 띠와 같은 기운이 들어오는 날입니다. 평소의 페이스를 지키면 좋습니다." };
  return { tone: "plain", label: "무난", text: "특별히 부딪히거나 돕는 관계가 없는 무난한 날입니다." };
}

/** 오늘의 일진과 띠별 관계(무료 읽을거리). 만세력 계산만 쓰고 AI는 쓰지 않는다. */
export default function TodayPage() {
  const { y, m, d, w } = kstToday();
  const gz = Solar.fromYmd(y, m, d).getLunar().getDayInGanZhi();
  const [stem, branch] = splitGanZhi(gz);
  const reading = STEM_KO[stem] + BRANCH_KO[branch];
  return (
    <SiteShell>
      <section className="card today-hero">
        <p className="eyebrow">오늘의 일진(日辰)</p>
        <h1>
          {y}년 {m}월 {d}일 ({WEEK[w]}) · {gz}({reading})일
        </h1>
        <p>
          오늘은 하늘의 기운이 <b>{stem}({ELEMENT_KO[STEM_ELEMENT[stem]]})</b>, 땅의 기운이 <b>{branch}({ELEMENT_KO[BRANCH_ELEMENT[branch]]})</b>인 날입니다. 아래는 태어난 해의
          띠와 오늘 일진의 지지가 만나는 관계(합·충·형·해·원진)를 만세력으로 계산한 것입니다.
        </p>
      </section>
      <section className="card">
        <h2>띠별 오늘의 기운</h2>
        <ul className="today-list">
          {BRANCHES.map((b) => {
            const l = lineFor(b, branch);
            return (
              <li key={b} className={`today-${l.tone}`}>
                <b>
                  {BRANCH_ANIMAL[b]}띠 <small>({b})</small>
                </b>
                <span className="today-tag">{l.label}</span>
                <p>{l.text}</p>
              </li>
            );
          })}
        </ul>
        <p className="muted">
          띠는 입춘(2월 4일 무렵)을 기준으로 바뀝니다. 1월생이나 2월 초 생은 앞 해의 띠일 수 있으니 무료 사주 보기에서 정확한 띠를 확인해 보세요. 띠만으로 보는
          운세는 참고용이며, 내 사주 전체(여덟 글자)와 오늘의 관계는 사람마다 다릅니다.
        </p>
      </section>
      <section className="card today-cta">
        <h2>내 사주로 보는 오늘의 운세</h2>
        <p>
          생년월일시를 넣으면 내 일간과 오늘 일진의 관계(십신)와 용신으로 본 좋음·보통·주의를 알려 드립니다. 카카오로 저장해 두면 &apos;마이&apos;에서 매일 볼 수
          있습니다.
        </p>
        <a className="btn-primary link-btn" href="/#saju-form">
          내 사주 무료로 보기
        </a>
      </section>
    </SiteShell>
  );
}
