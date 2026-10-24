// 한국어 첫 화면의 이야기 섹션들. 문구와 숫자는 천기록이 실제로 계산하고 감정서에 쓰는 것만 적는다.
// (과장 표현·근거 없는 수치·가짜 할인은 넣지 않는다.)
import type { CSSProperties } from "react";
import { calculateSaju } from "@/lib/saju/calc";
import { ELEMENT_KO } from "@/lib/saju/constants";
import { GRADE_TIERS } from "@/lib/saju/grade";
import stats from "@/lib/saju/grade-stats.json";
import samples from "../../data/samples/saju-texts.json";
import { PRODUCTS, REPORT_VALID_DAYS, won } from "@/lib/product";

const fmt = (n: number) => n.toLocaleString("ko-KR");

/** "해마다 다르다" + 대운 10년 + 유형 희소성(실제 통계) */
export function FlowBand() {
  const [from, to] = stats.range.split("-");
  const top = GRADE_TIERS[0];
  return (
    <section className="lp-section lp-flow" aria-labelledby="flow-h">
      <div className="lp-inner narrow center">
        <p className="flow-lines" id="flow-h">
          <span>힘을 실을 해</span>
          <span>방향을 바꿀 해</span>
          <span>숨을 고를 해</span>
        </p>
        <p className="flow-sub">사람마다 다릅니다.</p>
        <p className="flow-big">
          그리고 삶의 큰 흐름인 <b>대운</b>은 <em>10년</em>마다 바뀝니다.
        </p>
        <p className="flow-stat">
          {from}년부터 {to}년 사이에 태어날 수 있는 사주 <b>{fmt(stats.total)}</b>가지를 모두 계산해 다섯 유형의 비율을 냈습니다.
          <br />
          그중 {top.type.replace(/\(.*\)/, "")}은 <b>100명 중 {top.share}명</b>입니다. 내 사주는 어느 유형일까요?
        </p>
        <a className="lp-cta" href="#saju-form">내 사주 유형 무료로 확인하기</a>
      </div>
    </section>
  );
}

const FOR_WHOM = [
  ["열심히 사는데 왜 제자리 같은지", "내 흐름부터 알고 싶은 분"],
  ["이직·창업 같은 큰 결정 앞에서", "지금이 움직일 때인지 가늠하고 싶은 분"],
  ["돈이 들어오는 방식과 새는 자리를", "미리 알아 두고 싶은 분"],
  ["배우자·가족과의 관계를", "내 사주에 맞게 풀어 보고 싶은 분"],
  ["앞으로의 10년 대운과 전성기가", "궁금한 분"],
] as const;

/** 이런 분께 권합니다 */
export function ForWhom() {
  return (
    <section className="lp-section sunk lp-forwhom" aria-labelledby="forwhom-h">
      <div className="lp-inner narrow">
        <p className="lp-eyebrow">추천 대상</p>
        <h2 id="forwhom-h">이런 분께 권합니다</h2>
        <ul className="forwhom-list">
          {FOR_WHOM.map(([a, b]) => (
            <li key={a}>
              <span className="check" aria-hidden>✓</span>
              <span>
                {a} <b>{b}</b>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const STEPS = [
  ["여덟 글자를 세웁니다", "태어난 해·달·날·시를 절기 시각 기준 만세력으로 세우고, 출생지 경도에 맞춘 진태양시와 서머타임까지 반영합니다."],
  ["글자마다 뜻을 붙입니다", "십신(十神)과 지장간(地藏干)으로 각 글자가 나에게 어떤 역할을 하는지 봅니다."],
  ["사주 전체의 중심을 잡습니다", "신강·신약, 격국, 용신·희신·기신, 그리고 천을귀인 같은 귀인을 함께 따집니다."],
  ["그 위에 대운을 겹칩니다", "10년마다 바뀌는 대운을 평생에 걸쳐 놓고, 용신과 얼마나 맞는지 점수로 매깁니다."],
  ["다시 그 위에 세운과 월운", "가까운 두 해와 달마다 들어오는 글자까지 읽어, 언제 무엇을 할지 정리합니다."],
] as const;

const elVar = (e: string) => ({ "--el": `var(--el-${e})` }) as CSSProperties;

/** 일간 하나로 끝내지 않습니다: 예시 명식표 + 계산 단계 */
export function HowWeRead() {
  // 샘플 감정서와 같은 예시 명식(1990년 5월 15일 10시 30분, 양력, 남성)
  const chart = calculateSaju({ gender: "male", calendar: "solar", year: 1990, month: 5, day: 15, hour: 10, minute: 30 }, new Date("2026-01-01T00:00:00Z"));
  const cols = [
    ["時", chart.pillars.hour],
    ["日", chart.pillars.day],
    ["月", chart.pillars.month],
    ["年", chart.pillars.year],
  ] as const;
  return (
    <section className="lp-section lp-howread" aria-labelledby="howread-h">
      <div className="lp-inner narrow">
        <h2 id="howread-h">
          일간 하나로 정하지 않고,
          <br />
          주변 글자를 모두 함께 읽습니다
        </h2>
        <div className="mini-chart" aria-label="예시 명식">
          {cols.map(([label, p]) => (
            <div key={label} className={label === "日" ? "col me" : "col"}>
              <span className="lab">{label}</span>
              {p ? (
                <>
                  <span className="g" style={elVar(p.stemElement)}>{p.stem}</span>
                  <span className="g" style={elVar(p.branchElement)}>{p.branch}</span>
                  <span className="sub">{ELEMENT_KO[p.stemElement]}·{ELEMENT_KO[p.branchElement]}</span>
                </>
              ) : (
                <span className="sub">-</span>
              )}
            </div>
          ))}
        </div>
        <p className="muted center small">예시 명식 · 1990년 5월 15일 10시 30분(양력) 남성</p>
        <ol className="read-steps">
          {STEPS.map(([t, d], i) => (
            <li key={t}>
              <span className="num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const BASIS: [string, string][] = [
  ["만세력과 절기 시각", "태어난 순간을 절기가 바뀌는 시각까지 따져 해·달·날·시의 간지를 세웁니다. 출생지 경도에 맞춘 진태양시와 과거 서머타임도 반영합니다."],
  ["명리 이론에 따른 계산", "십신·지장간·신강약·격국·용신, 10년 대운과 해마다의 세운·월운을 정해진 공식으로 계산합니다."],
  ["궁합·택일", "두 명식의 합·충·형·해·파·원진과 오행 보완을, 택일은 날마다의 일진과 전통 역서(황도·흑도, 건제 12직, 마땅한 일·꺼리는 일)를 함께 따집니다."],
  ["주역 원문·자미두수 명반", "주역 점은 『주역』 64괘의 괘사·효사 원문과 주희의 변효 점법을, 자미두수는 생년월일시로 세운 열두 궁의 별 배치를 근거로 합니다."],
];

/** 무작위로 쓰지 않습니다: 감정서의 근거 데이터 */
export function Basis() {
  return (
    <section className="lp-section sunk lp-basis" aria-labelledby="basis-h">
      <div className="lp-inner narrow">
        <p className="lp-eyebrow">감정서의 근거</p>
        <h2 id="basis-h">
          무작위로 뽑아 쓰지 않습니다.
          <br />
          정확한 계산 데이터로 씁니다
        </h2>
        <ul className="receive-list">
          {BASIS.map(([t, d]) => (
            <li key={t}>
              <span className="check" aria-hidden>✓</span>
              <div>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="basis-note">
          <b>같은 생년월일시를 넣으면 계산값은 언제나 똑같이 나옵니다.</b> 감정서의 문장은 이 계산값만을 근거로 쓰며, 계산에 없는 간지·별·날짜·점수를
          지어내지 않습니다. 근거가 된 명식표·점수표·일진표는 감정서 안에 그대로 실어 드려 직접 확인하실 수 있습니다.
        </p>
        <p className="muted small">
          ※ 주역 점은 점법의 본래 방식대로 괘를 한 번 얻는 과정(시초점의 확률)이 있습니다. 얻은 괘는 저장되어 바뀌지 않고, 그 풀이는 원문과 정해진
          점법을 따릅니다.
        </p>
      </div>
    </section>
  );
}

/** 목차 각 부를 손님이 궁금해할 질문으로 */
export const PART_QUESTIONS: Record<string, string> = {
  part1: "나는 어떤 그릇을 타고났을까",
  part2: "돈은 어떻게 들어오고, 어디서 샐까",
  part3: "나와 맞는 사람, 관계는 어떻게 풀까",
  part4: "지금은 오르막일까, 전성기는 언제일까",
  part5: "앞으로 두 해, 달마다 무엇을 할까",
};

/** 실제 샘플 감정서에서 한 문단 */
export function Excerpt() {
  const sec = samples.part4.sections[1];
  return (
    <section className="lp-section lp-excerpt" aria-labelledby="excerpt-h">
      <div className="lp-inner narrow">
        <p className="lp-eyebrow">감정서 미리보기</p>
        <h2 id="excerpt-h">이런 문장으로 쓰여 있습니다</h2>
        <article className="excerpt-card">
          <p className="excerpt-label">제4부 · 10년 대운의 흐름</p>
          <h3>{sec.heading}</h3>
          {sec.paragraphs.map((p) => (
            <p key={p.slice(0, 20)}>{p}</p>
          ))}
          <p className="muted small">샘플 감정서(예시 명식) 중 일부입니다. 실제 감정서는 의뢰인의 명식으로 새로 씁니다.</p>
        </article>
      </div>
    </section>
  );
}

type Mark = "y" | "n";
const COMPARE: [string, Mark, Mark, Mark][] = [
  ["여덟 글자 명식과 오행", "y", "y", "y"],
  ["사주 유형과 점수 근거", "y", "y", "y"],
  ["발간사(한 권의 요약)", "n", "y", "y"],
  ["제1부 타고난 기질·격국·용신", "n", "y", "y"],
  ["제2부 재물과 커리어", "n", "n", "y"],
  ["제3부 애정·인연 (결혼·자녀 맞춤)", "n", "n", "y"],
  ["제4부 10년 대운과 전성기, 대운 곡선", "n", "n", "y"],
  ["제5부 두 해 세운·월별 흐름·개운법", "n", "y", "y"],
  ["책자형 PDF·HTML 파일", "n", "y", "y"],
];

/** 무료 결과 · 핵심 명식록 · 종합 감정서 비교 */
export function Compare() {
  const core = PRODUCTS.core;
  const full = PRODUCTS.full;
  const m = (v: Mark) => (v === "y" ? <span className="yes" aria-label="포함">✓</span> : <span className="no" aria-label="없음">–</span>);
  return (
    <section className="lp-section sunk lp-compare" aria-labelledby="compare-h">
      <div className="lp-inner">
        <h2 id="compare-h">무엇이 담기는지 한눈에 비교하세요</h2>
        <p className="lp-lead">핵심은 {core.name}, 종합은 {full.name}입니다.</p>
        <div className="compare-wrap">
          <table className="compare">
            <colgroup>
              <col className="label" />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th />
                <th>무료<small>결과 화면</small></th>
                <th>핵심<small>{won(core.price)}</small></th>
                <th className="hl">종합<small>{won(full.price)}</small></th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([label, a, b, c]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  <td>{m(a)}</td>
                  <td>{m(b)}</td>
                  <td className="hl">{m(c)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">분량(샘플 기준)</th>
                <td>화면</td>
                <td>12~15쪽</td>
                <td className="hl">18~22쪽</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** 결제 후 받으시는 것 */
export function Receive() {
  const items: [string, string][] = [
    ["책자형 감정서 한 권", "A4 책자 모양 그대로, PDF 파일과 인터넷 없이 열리는 HTML 문서로 드립니다."],
    ["유형표·월별 흐름표 (종합은 대운 곡선까지)", "글로 읽기 전에 내 사주의 모양을 표와 그래프로 먼저 봅니다."],
    ["결제 확인과 파일 발송", "결제 직후 주문번호·결제 내역과 명식 미리보기를, 상품에 따라 10분~1시간 30분 뒤 감정서 파일을 고르신 곳(이메일·카카오톡·문자)으로 보내 드립니다."],
    ["다시 열어 보기", `감정서 화면은 ${REPORT_VALID_DAYS}일 동안 열 수 있고, 주소를 잃어버려도 주문 조회로 다시 찾을 수 있습니다. 받은 파일은 계속 보관하시면 됩니다.`],
  ];
  return (
    <section className="lp-section lp-receive" aria-labelledby="receive-h">
      <div className="lp-inner narrow">
        <h2 id="receive-h">결제 후 받으시는 것</h2>
        <ul className="receive-list">
          {items.map(([t, d]) => (
            <li key={t}>
              <span className="check" aria-hidden>✓</span>
              <div>
                <b>{t}</b>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="receive-price">
          핵심 명식록 {won(PRODUCTS.core.price)}, 커피 몇 잔 값으로 두 해의 흐름과 달마다 할 일까지 받아 보세요.
        </p>
      </div>
    </section>
  );
}
