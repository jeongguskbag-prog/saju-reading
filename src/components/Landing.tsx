import type { ReactNode } from "react";
import { BRAND, PRODUCT_ORDER, PRODUCTS, withProductYears, won } from "@/lib/product";
import { CHAPTER_KEYS, withYears } from "@/lib/report-shared";
import { chaptersFor } from "@/lib/report-shared";
import { gradeTiers } from "@/lib/saju/grade";
import { siteCopy, SITES, type SiteLocale } from "@/lib/site-copy";
import { GRADE_TIERS } from "@/lib/saju/grade";
import stats from "@/lib/saju/grade-stats.json";
import Seal from "./Seal";
import BrandSeal from "./BrandSeal";
import SiteFooter from "./SiteFooter";
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

export default function Landing({ form, checkoutOpen = false, site = "ko" }: { form: ReactNode; checkoutOpen?: boolean; site?: SiteLocale }) {
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
            <h1>{L.h1}</h1>
            <p className="lp-hero-sub">{L.heroSub}</p>
            <div className="lp-cta-row">
              <a className="lp-cta" href="#saju-form">{L.ctaGrade}</a>
              <a className="lp-cta-ghost on-cover" href="#price">{L.ctaPrice}</a>
            </div>
          </div>
        </div>
      </header>

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
                    {cfg.locale === "ko" ? ". " : "。"}
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

      <Section id="contents" tone="sunk" title={L.contentsTitle} lead={L.contentsLead}>
        <ol className="lp-toc">
          {CHAPTER_KEYS.map((k, i) => {
            const c = chapters[k];
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
        title={L.priceTitle}
        lead={L.priceLead}
      >
        <div className="lp-products">
          {PRODUCT_ORDER.map((id) => {
            const p = PRODUCTS[id];
            const text = t.products[id];
            const featured = id === "full";
            return (
              <div key={id} className={`lp-plan${featured ? " paid" : ""}${p.available ? "" : " soon"}`}>
                {featured && <span className="lp-pick">{L.pick}</span>}
                <h3>{text.name}</h3>
                {/* 해외 화면은 현지 화폐 가격이 정해질 때까지 가격을 적지 않는다 */}
                {sales && <p className="lp-price">{won(p.price)}</p>}
                <p className="lp-plan-sum">{withProductYears(text.summary, years)}</p>
                {p.available ? (
                  <p className="lp-plan-parts">
                    {p.parts.length - 1 === 5 ? L.partsAll : L.partsCore} · {L.partsExtra}
                  </p>
                ) : (
                  <p className="lp-soon">{L.productSoon}</p>
                )}
                {p.available &&
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
        <ol className="lp-steps">
          {L.steps.map((st) => (
            <li key={st.b}><b>{st.b}</b> {st.t}</li>
          ))}
        </ol>
      </Section>

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
    </div>
  );
}
