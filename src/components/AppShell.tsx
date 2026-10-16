import type { ReactNode } from "react";
import { messages } from "@/lib/messages";
import type { Locale } from "@/lib/saju/locale";
import BrandSeal from "./BrandSeal";

export default function AppShell({ children, locale = "ko" }: { children: ReactNode; locale?: Locale }) {
  const t = messages(locale);
  return (
    <main className={`container${locale === "zh-Hant" ? " zh" : locale === "zh-Hans" ? " zh-hans" : ""}`} lang={t.htmlLang}>
      <header className="site">
        <span className="badge no-print">{t.shellBadge}</span>
        <h1 className="app-brand"><BrandSeal size={40} title="" />{t.brand}</h1>
        <p className="no-print">{t.shellIntro}</p>
      </header>
      {children}
      <p className="disclaimer">{t.shellDisclaimer}</p>
    </main>
  );
}
