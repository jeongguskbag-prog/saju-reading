import { SITE_ORDER, SITES, type SiteLocale } from "@/lib/site-copy";

/**
 * 화면 맨 위 오른쪽 언어 선택. 자바스크립트 없이 열리는 목록(<details>)이라 어떤 화면에서도 동작한다.
 * 링크에 ?lang=을 붙여, 고른 언어를 기억하게 한다(브라우저 언어보다 우선).
 */
export default function LangSwitch({ site = "ko", tone = "cover" }: { site?: SiteLocale; tone?: "cover" | "bar" }) {
  return (
    <details className={`lang-switch lang-${tone}`}>
      <summary aria-label="Language / 언어 / 語言">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3 12h18M12 3c2.6 2.8 2.6 15.2 0 18M12 3c-2.6 2.8-2.6 15.2 0 18" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <span>{SITES[site].label}</span>
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden className="lang-caret">
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </summary>
      <ul>
        {SITE_ORDER.map((l) => (
          <li key={l}>
            <a href={`${SITES[l].path || "/"}?lang=${l}`} hrefLang={SITES[l].hreflang} lang={SITES[l].htmlLang} aria-current={l === site ? "true" : undefined}>
              {SITES[l].label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
