import type { Metadata } from "next";
import Landing from "./Landing";
import SajuApp from "./SajuApp";
import { getMessages, languageAlternates, LOCALES, type Locale } from "@/lib/i18n";

/** 해외(대만·홍콩) 첫 화면. 지금은 무료 명식·등급까지만 열고, 감정서 결제는 해외 결제가 붙으면 연다. */
export default function LocaleHome({ locale }: { locale: Locale }) {
  return <Landing locale={locale} checkoutOpen={false} form={<SajuApp aiEnabled={false} locale={locale} />} />;
}

export function localeMetadata(locale: Locale): Metadata {
  const t = getMessages(locale);
  const cfg = LOCALES[locale];
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: { canonical: cfg.path || "/", languages: languageAlternates() },
    openGraph: {
      siteName: t.brand.name,
      locale: cfg.ogLocale,
      type: "website",
      title: t.meta.title,
      description: t.meta.description,
      url: cfg.path || "/",
      images: [{ url: "/brand/og-zh.png", width: 1200, height: 630, alt: `${t.brand.name} ${t.brand.tagline}` }],
    },
    twitter: { card: "summary_large_image", title: t.meta.title, description: t.meta.description, images: ["/brand/og-zh.png"] },
  };
}
