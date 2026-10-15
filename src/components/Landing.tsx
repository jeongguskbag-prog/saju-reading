import type { ReactNode } from "react";
import { BRAND, PRODUCT_ORDER, PRODUCTS, REPORT_VALID_DAYS, withProductYears, won } from "@/lib/product";
import { CHAPTERS, CHAPTER_KEYS, withYears } from "@/lib/report-shared";
import { GRADE_TIERS } from "@/lib/saju/grade";
import stats from "@/lib/saju/grade-stats.json";
import Seal from "./Seal";
import BrandSeal from "./BrandSeal";
import SiteFooter from "./SiteFooter";
import { FloatingKakao, SupportBox } from "./SupportLinks";

const fmt = (n: number) => n.toLocaleString("ko-KR");
const HANJA_NUM = ["一", "二", "三", "四", "五"];

/** 오른쪽 가장자리를 다섯 바늘로 꿰맨 제본(오침안정법). 첫 화면 전체가 쪽빛 고서 표지가 된다. */
function Binding() {
  return (
    <svg className="lp-binding" viewBox="0 0 44 500" preserveAspectRatio="none" aria-hidden>
      <line x1="16" y1="0" x2="16" y2="500" className="crease" />
      {[50, 150, 250, 350, 450].map((y) => (
        <g key={y}>
          <line x1="16" y1={y} x2="44" y2={y} className="thread" />
          <circle cx="16" cy={y} r="2.2" className="hole" />
        </g>
      ))}
      <line x1="16" y1="0" x2="16" y2="500" className="thread faint" />
    </svg>
  );
}

function Section({ id, title, lead, children, tone }: { id?: string; title: string; lead?: string; children: ReactNode; tone?: "plain" | "sunk" }) {
  return (
    <section id={id} className={`lp-section${tone === "sunk" ? " sunk" : ""}`} aria-labelledby={id ? `${id}-h` : undefined}>
      <div className="lp-inner">
        <h2 id={id ? `${id}-h` : undefined}>{title}</h2>
        {lead && <p className="lp-lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}

const FAQ = [
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
];

export default function Landing({ form, checkoutOpen = false }: { form: ReactNode; checkoutOpen?: boolean }) {
  const year = new Date().getFullYear();
  const years: [number, number] = [year, year + 1];
  return (
    <div className="lp">
      <header className="lp-hero">
        <Binding />
        <div className="lp-hero-inner">
          <div className="lp-slip" aria-hidden>
            {/* 세로쓰기: 글꼴마다 세로 조판 지원이 달라 글자를 한 자씩 쌓는다 */}
            <span className="slip-title">{[...BRAND.hanja].map((c, i) => <span key={i}>{c}</span>)}</span>
            <span className="slip-sub">{[..."百年綜合四柱"].map((c, i) => <span key={i}>{c}</span>)}</span>
          </div>
          <div className="lp-hero-text">
            <p className="lp-brand">
              <BrandSeal size={40} title="" />
              {BRAND.name} <span>{BRAND.tagline}</span>
            </p>
            <h1>태어난 순간의 여덟 글자로 100년의 흐름을 적어 드립니다</h1>
            <p className="lp-hero-sub">
              하늘의 기밀을 열어 인생의 나침반을 밝힙니다. 사주 원국과 대운의 흐름을 정밀하게 계산해, 의뢰인 한 분만을 위한 맞춤 감정서를
              엮어 드립니다. 내 사주의 등급은 무료로 먼저 확인하세요.
            </p>
            <div className="lp-cta-row">
              <a className="lp-cta" href="#saju-form">내 사주 등급 보기</a>
              <a className="lp-cta-ghost on-cover" href="#price">감정서 안내</a>
            </div>
          </div>
        </div>
      </header>

      <Section
        id="grade"
        title="다섯 등급, 하나의 기준"
        lead={`${stats.range.replace("-", "년부터 ")}년까지 태어날 수 있는 사주 ${fmt(stats.total)}개를 모두 같은 기준으로 계산했습니다. 오행의 균형, 대운의 도움, 용신의 힘, 귀인을 점수로 매기고 그 안에서 내 자리를 보여 드립니다.`}
      >
        <div className="lp-grade">
          <ol className="lp-tiers">
            {GRADE_TIERS.map((t) => (
              <li key={t.level}>
                <Seal level={t.level} label={`${t.level}등급`} />
                <div>
                  <b>{t.name}</b>
                  <p>{t.desc}</p>
                </div>
                <span className="lp-share">{t.share}%</span>
              </li>
            ))}
          </ol>
          <p className="lp-note">
            오른쪽 숫자는 전체 사주 가운데 그 등급에 드는 비율입니다. 같은 일주·격국·용신을 가진 사람이 몇 명 중 한 명인지, 천을귀인과
            문창귀인이 있는지, 대운의 전성기가 몇 살부터인지도 함께 알려 드립니다.
          </p>
        </div>
      </Section>

      <Section id="contents" tone="sunk" title="한 권에 담기는 다섯 부" lead="등급표와 대운 곡선, 월별 흐름표가 풀이와 함께 책처럼 엮여 PDF로 남습니다.">
        <ol className="lp-toc">
          {CHAPTER_KEYS.map((k, i) => {
            const c = CHAPTERS[k];
            return (
              <li key={k}>
                <span className="lp-toc-num" aria-label={c.label}>第{HANJA_NUM[i]}部</span>
                <div>
                  <b>{withYears(c.title, years)}</b>
                  <p>{c.sections.map((s) => withYears(s, years)).join(", ")}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section
        id="price"
        title="천기록 주요 감정 안내"
        lead="바람의 방향을 아는 배는 길을 잃지 않습니다. 지금 가장 풀리지 않는 고민이나 마주한 전환점이 있다면, 사주 원국과 대운의 흐름으로 그 길을 함께 살펴 드립니다."
      >
        <div className="lp-products">
          {PRODUCT_ORDER.map((id) => {
            const p = PRODUCTS[id];
            const featured = id === "full";
            return (
              <div key={id} className={`lp-plan${featured ? " paid" : ""}${p.available ? "" : " soon"}`}>
                {featured && <span className="lp-pick">추천</span>}
                <h3>{p.name}</h3>
                <p className="lp-price">{won(p.price)}</p>
                <p className="lp-plan-sum">{withProductYears(p.summary, years)}</p>
                {p.available ? (
                  <p className="lp-plan-parts">
                    {p.parts.length - 1 === 5 ? "1~5부 전체" : "1부 천명 · 5부 세운과 개운법"} · 등급표·대운 곡선·월별 흐름표 · 책자형 PDF
                  </p>
                ) : (
                  <p className="lp-soon">준비 중입니다</p>
                )}
                {p.available &&
                  (checkoutOpen ? (
                    <a className={featured ? "lp-cta" : "lp-cta-ghost"} href="#saju-form">
                      생년월일시 넣고 신청하기
                    </a>
                  ) : (
                    <p className="lp-soon">결제는 준비 중입니다.</p>
                  ))}
              </div>
            );
          })}
        </div>
        <ol className="lp-steps">
          <li><b>무료 확인</b> 생년월일시를 넣으면 사주 명식과 등급·희소도를 바로 보여 드립니다.</li>
          <li><b>감정서 신청</b> 감정서를 고르고 성함과 이메일을 적어 결제합니다.</li>
          <li><b>완성 메일</b> 결제 즉시 작성을 시작하고, 완성되면 감정서 링크를 메일로 보내 드립니다. 링크는 {REPORT_VALID_DAYS}일 동안 열 수 있고 PDF로 저장할 수 있습니다.</li>
        </ol>
      </Section>

      <Section id="method" tone="sunk" title="이렇게 계산합니다">
        <dl className="lp-method">
          <div>
            <dt>절기 시각</dt>
            <dd>년주와 월주는 입춘·경칩 같은 절기가 바뀌는 시각을 분 단위로 따져 세웁니다. 설날이나 1월 1일이 기준이 아닙니다.</dd>
          </div>
          <div>
            <dt>한국 시간의 역사</dt>
            <dd>1954~1961년의 표준시 변경과 1987·1988년 서머타임을 반영해, 그때 시계로 적힌 출생 시각을 바로잡습니다.</dd>
          </div>
          <div>
            <dt>태양의 실제 위치</dt>
            <dd>서울의 경도에 맞춰 약 32분을 보정한 진태양시로 시주를 정합니다. 자시 출생의 날짜 기준도 직접 고를 수 있습니다.</dd>
          </div>
        </dl>
      </Section>

      <section id="saju-form" className="lp-section lp-form" aria-labelledby="saju-form-h">
        <div className="lp-inner narrow">
          <h2 id="saju-form-h">1:1 맞춤 감정 신청</h2>
          <p className="lp-lead">
            생년월일시를 적으면 사주 명식과 등급이 바로 나옵니다. 결과 아래에서 감정서를 골라 신청할 수 있습니다. 태어난 시간을 모르면
            &lsquo;모름&rsquo;을 고르세요. 시주를 빼고 분석합니다.
          </p>
          {form}
        </div>
      </section>

      <Section id="help" tone="sunk" title="도움이 필요하신가요?">
        <SupportBox />
      </Section>

      <Section id="faq" title="자주 묻는 질문">
        <div className="lp-faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <SiteFooter />
      <FloatingKakao />
    </div>
  );
}
