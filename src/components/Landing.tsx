import type { ReactNode } from "react";
import ExtraProducts from "./extras/ExtraProducts";
import SeasonBanner from "./SeasonBanner";
import TrackVisit from "./TrackVisit";
import { releaseMinutes, waitLabel } from "@/lib/release";
import ConsultIntro from "./ConsultIntro";
import { BRAND, PRODUCT_ORDER, PRODUCTS, withProductYears, won } from "@/lib/product";
import { CHAPTER_KEYS, withYears } from "@/lib/report-shared";
import { chaptersFor } from "@/lib/report-shared";
import { gradeTiers } from "@/lib/saju/grade";
import { siteCopy, SITES, type SiteLocale } from "@/lib/site-copy";
import { GRADE_TIERS } from "@/lib/saju/grade";
import stats from "@/lib/saju/grade-stats.json";
import Seal from "./Seal";
import SamplePreview from "./SamplePreview";
import BrandSeal from "./BrandSeal";
import SiteFooter from "./SiteFooter";
import LangSwitch from "./LangSwitch";
import OwnerLinks from "./OwnerLinks";
import ReviewsSection from "./ReviewsSection";
import TopicCards from "./TopicCards";
import { Basis, Compare, Excerpt, FlowBand, ForWhom, HowWeRead, PART_QUESTIONS, Receive } from "./LandingStory";
import StickyCta from "./StickyCta";
import BottomNav from "./BottomNav";
import type { Review } from "@/lib/reviews";
import { FloatingKakao, SupportBox } from "./SupportLinks";

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

export default function Landing({ form, checkoutOpen = false, site = "ko", reviews = [] }: { form: ReactNode; checkoutOpen?: boolean; site?: SiteLocale; reviews?: Review[] }) {
  const t = siteCopy(site);
  const L = t.landing;
  const cfg = SITES[site];
  const sales = cfg.sales;
  const tiers = gradeTiers(cfg.locale);
  const chapters = chaptersFor(cfg.locale);
  const fmt = (n: number) => n.toLocaleString(t.numberLocale);
  const [from, to] = stats.range.split("-");
  const year = new Date().getFullYear();
  const years: [number, number] = [year, year + 1];
  return (
    <div className="lp">
      <header className="lp-hero">
        <Binding />
        <LangSwitch site={site} />
        <OwnerLinks mode="home" />
        <div className="lp-hero-inner">
          <div className="lp-slip" aria-hidden>
            {/* 세로쓰기: 글꼴마다 세로 조판 지원이 달라 글자를 한 자씩 쌓는다 */}
            <span className="slip-title">{[...BRAND.hanja].map((c, i) => <span key={i}>{c}</span>)}</span>
            <span className="slip-sub">{[...L.slipSub].map((c, i) => <span key={i}>{c}</span>)}</span>
          </div>
          <div className="lp-hero-text">
            <p className="lp-brand">
              <BrandSeal size={40} title="" />
              {t.brand.name} <span>{t.brand.tagline}</span>
            </p>
            {site === "ko" && <p className="lp-hero-ask">내 사주는 다섯 유형 중 어디일까?</p>}
            <h1>{L.h1}</h1>
            <p className="lp-hero-sub">{L.heroSub}</p>
            <div className="lp-cta-row">
              <a className="lp-cta" href="#saju-form">{L.ctaGrade}</a>
              <a className="lp-cta-ghost on-cover" href="#price">{L.ctaPrice}</a>
            </div>
          </div>
        </div>
      </header>

      {site === "ko" && <SeasonBanner />}
      <TrackVisit />

      {/* 재미로 보는 운세와 다른 점: 계산 자료와 명리학 근거를 첫 화면 바로 아래에서 강조한다. */}
      <section id="trust" className="lp-section lp-trust" aria-labelledby="trust-h">
        <div className="lp-inner">
          <p className="lp-trust-eyebrow">{L.trustEyebrow}</p>
          <h2 id="trust-h">{L.trustTitle}</h2>
          <p className="lp-lead">{L.trustLead}</p>
          <ul className="lp-trust-grid">
            {L.trust(from, to, fmt(stats.total)).map((x) => (
              <li key={x.n}>
                <p className="lp-trust-head">
                  <b>{x.n}</b>
                  {x.t}
                </p>
                <p>{x.d}</p>
              </li>
            ))}
          </ul>
          <div className="lp-pledge">
            <p className="lp-pledge-title">{L.pledgeTitle}</p>
            <ul>
              {L.pledge.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Section
        id="grade"
        title={L.gradeTitle}
        lead={L.gradeLead(from, to, fmt(stats.total))}
      >
        <div className="lp-grade">
          <ol className="lp-tiers">
            {GRADE_TIERS.map((tier) => (
              <li key={tier.level}>
                <Seal level={tier.level} label={(tiers.find((x) => x.level === tier.level) ?? tier).type} />
                <div>
                  <b>{(tiers.find((x) => x.level === tier.level) ?? tier).type}</b>
                  <p>
                    {(tiers.find((x) => x.level === tier.level) ?? tier).name}
                    {cfg.locale === "zh-Hant" ? "。" : ". "}
                    {(tiers.find((x) => x.level === tier.level) ?? tier).desc}
                  </p>
                </div>
                <span className="lp-share">{tier.share}%</span>
              </li>
            ))}
          </ol>
          <p className="lp-note">{L.gradeNote}</p>
        </div>
      </Section>

      {site === "ko" && <FlowBand />}
      {site === "ko" && <ForWhom />}
      {site === "ko" && <TopicCards years={years} />}
      {site === "ko" && <HowWeRead />}
      {site === "ko" && <Basis />}

      <Section id="contents" tone="sunk" title={L.contentsTitle} lead={L.contentsLead}>
        <ol className="lp-toc">
          {CHAPTER_KEYS.map((k, i) => {
            const c = chapters[k];
            return (
              <li key={k}>
                <span className="lp-toc-num" aria-label={c.label}>第{HANJA_NUM[i]}部</span>
                <div>
                  {site === "ko" && PART_QUESTIONS[k] && <span className="lp-toc-q">{PART_QUESTIONS[k]}</span>}
                  <b>{withYears(c.title, years)}</b>
                  <p>{c.sections.map((s) => withYears(s, years)).join(", ")}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {site === "ko" && <Excerpt />}
      {site === "ko" && <Compare />}

      <Section
        id="price"
        title={L.priceTitle}
        lead={L.priceLead}
      >
        <div className="lp-products">
          {PRODUCT_ORDER.map((id) => {
            const p = PRODUCTS[id];
            const text = t.products[id];
            const featured = id === "full";
            // 작명록은 한국 이름(한글·인명용 한자) 기준이라 한국어 화면에서만 판다.
            const available = p.available && (site === "ko" || id !== "naming");
            return (
              <div key={id} className={`lp-plan${featured ? " paid" : ""}${available ? "" : " soon"}`}>
                {featured && <span className="lp-pick">{L.pick}</span>}
                <h3>{text.name}</h3>
                {/* 해외 화면은 현지 화폐 가격이 정해질 때까지 가격을 적지 않는다 */}
                {sales && <p className="lp-price">{won(p.price)}</p>}
                {site === "ko" && available && <p className="lp-wait">⏳ 결제 후 약 {waitLabel(releaseMinutes(id))} 뒤 발송 · 명식 미리보기는 바로</p>}
                <p className="lp-plan-sum">{withProductYears(text.summary, years)}</p>
                {available ? (
                  <p className="lp-plan-parts">
                    {p.id === "naming" ? L.partsNaming : `${p.parts.length - 1 === 5 ? L.partsAll : L.partsCore} · ${L.partsExtra}`}
                  </p>
                ) : (
                  <p className="lp-soon">{L.productSoon}</p>
                )}
                {available &&
                  (checkoutOpen && sales ? (
                    <a className={featured ? "lp-cta" : "lp-cta-ghost"} href="#saju-form">
                      {L.applyCta}
                    </a>
                  ) : (
                    <p className="lp-soon">{L.payPending}</p>
                  ))}
              </div>
            );
          })}
        </div>
        {site === "ko" && <ExtraProducts years={years} checkoutOpen={checkoutOpen && sales} />}
        {site === "ko" && (
          <div className="lp-sample">
            <SamplePreview />
          </div>
        )}
        <ol className="lp-steps">
          {L.steps.map((st) => (
            <li key={st.b}><b>{st.b}</b> {st.t}</li>
          ))}
        </ol>
      </Section>

      {site === "ko" && <Receive />}

      <Section id="method" tone="sunk" title={L.methodTitle}>
        <dl className="lp-method">
          {L.method.map((m) => (
            <div key={m.dt}>
              <dt>{m.dt}</dt>
              <dd>{m.dd}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {site === "ko" && <ConsultIntro />}

      {site === "ko" && <ReviewsSection reviews={reviews} />}

      <section id="saju-form" className="lp-section lp-form" aria-labelledby="saju-form-h">
        <div className="lp-inner narrow">
          <h2 id="saju-form-h">{L.formTitle}</h2>
          <p className="lp-lead">{L.formLead}</p>
          {form}
        </div>
      </section>

      <Section id="help" tone="sunk" title={L.helpTitle}>
        <SupportBox site={site} />
      </Section>

      <Section id="faq" title={L.faqTitle}>
        <div className="lp-faq">
          {L.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <SiteFooter site={site} />
      <FloatingKakao site={site} />
      {site === "ko" && <StickyCta />}
      {site === "ko" && <BottomNav />}
    </div>
  );
}
