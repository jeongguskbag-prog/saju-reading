import { BUSINESS, orPending } from "@/lib/product";
import { siteCopy, SITE_ORDER, SITES, type SiteLocale } from "@/lib/site-copy";
import BrandSeal from "./BrandSeal";

/** 모든 화면 하단: 사업자 정보와 약관·방침 링크, 언어 전환. 인쇄(PDF)에는 넣지 않는다. */
export default function SiteFooter({ site = "ko" }: { site?: SiteLocale }) {
  const t = siteCopy(site);
  const f = t.footer;
  const b = BUSINESS;
  const pending = (v: string) => (site === "ko" ? orPending(v) : v || f.pending);
  return (
    <footer className="site-footer no-print">
      <div className="site-footer-inner">
        <p className="site-footer-brand">
          <BrandSeal size={28} title="" />
          {t.brand.name}
        </p>
        <nav className="site-footer-links" aria-label={f.linksAria}>
          <a href="/terms">{f.terms}</a>
          <a href="/privacy">
            <b>{f.privacy}</b>
          </a>
          <a href="/refund">{f.refund}</a>
        </nav>
        <dl className="site-footer-biz">
          <div><dt>{f.biz.companyName}</dt><dd>{pending(b.companyName)}</dd></div>
          <div><dt>{f.biz.ceo}</dt><dd>{pending(b.ceo)}</dd></div>
          <div><dt>{f.biz.bizNumber}</dt><dd>{pending(b.bizNumber)}</dd></div>
          <div><dt>{f.biz.mailOrderNumber}</dt><dd>{pending(b.mailOrderNumber)}</dd></div>
          <div><dt>{f.biz.address}</dt><dd>{pending(b.address)}</dd></div>
          <div><dt>{f.biz.contact}</dt><dd>{[b.phone, b.email].filter(Boolean).join(" / ") || f.pending}</dd></div>
        </dl>
        <p className="site-footer-note">{f.note(t.brand.name)}</p>
        <nav className="site-footer-langs" aria-label={f.languages}>
          {SITE_ORDER.map((l) => (
            <a key={l} href={SITES[l].path || "/"} hrefLang={SITES[l].hreflang} lang={SITES[l].htmlLang} aria-current={l === site ? "true" : undefined}>
              {SITES[l].label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
