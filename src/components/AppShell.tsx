import type { ReactNode } from "react";
import { messages } from "@/lib/messages";
import type { Locale } from "@/lib/saju/locale";
import BrandSeal from "./BrandSeal";

export default function AppShell({ children, locale = "ko" }: { children: ReactNode; locale?: Locale }) {
  const t = messages(locale);
  return (
    <main className={`container${locale === "zh-Hant" ? " zh" : locale === "zh-Hans" ? " zh-hans" : ""}`} lang={t.htmlLang}>
      <header className="site app-head">
        {/* 오른쪽 위 바로가기: 천기록 홈페이지와 관리자 화면. 같은 사이트라 앱 안에서 열리고, 뒤로 가기로 돌아온다. */}
        <nav className="app-links no-print" aria-label={t.shellLinksAria}>
          <a href="/">{t.shellHome}</a>
          <a href="/admin">{t.shellAdmin}</a>
        </nav>
        <span className="badge no-print">{t.shellBadge}</span>
        <h1 className="app-brand"><BrandSeal size={40} title="" />{t.brand}</h1>
        <p className="no-print">{t.shellIntro}</p>
      </header>
      {children}
      <p className="disclaimer">{t.shellDisclaimer}</p>
    </main>
  );
}
