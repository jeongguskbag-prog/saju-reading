import type { Metadata } from "next";
import Landing from "./Landing";
import SajuApp from "./SajuApp";
import { LocaleProvider } from "./LocaleProvider";
import { languageAlternates, siteCopy, SITES, type SiteLocale } from "@/lib/site-copy";

/**
 * 해외(대만·홍콩) 웹 첫 화면. 명식·등급은 번체(zh-Hant) 문구로 무료로 보여 주고,
 * 감정서 결제는 해외 결제가 붙으면 연다.
 */
export default function SiteHome({ site }: { site: Exclude<SiteLocale, "ko"> }) {
  const cfg = SITES[site];
  const notice = siteCopy(site).landing.resultNotice;
  return (
    <div className="zh" lang={cfg.htmlLang}>
      {/* 번체 한자 명조. 한국어 화면의 Song Myung에는 번체 글자가 빠져 있다. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&display=swap" />
      <Landing
        site={site}
        checkoutOpen={false}
        form={
          <LocaleProvider locale={cfg.locale}>
            <SajuApp
              aiEnabled={false}
              regions={cfg.regions}
              afterGrade={
                notice && (
                  <section className="card no-print">
                    <h2>{notice.title}</h2>
                    <p className="muted">{notice.text}</p>
                  </section>
                )
              }
            />
          </LocaleProvider>
        }
      />
    </div>
  );
}

export function siteMetadata(site: Exclude<SiteLocale, "ko">): Metadata {
  const t = siteCopy(site);
  const cfg = SITES[site];
  const og = { url: "/brand/og-zh.png", width: 1200, height: 630, alt: `${t.brand.name} ${t.brand.tagline}` };
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: { canonical: cfg.path, languages: languageAlternates() },
    openGraph: { siteName: t.brand.name, locale: cfg.ogLocale, type: "website", title: t.meta.title, description: t.meta.description, url: cfg.path, images: [og] },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description, images: [og.url] },
  };
}
