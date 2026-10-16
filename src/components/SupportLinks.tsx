import { BUSINESS, kakaoChatUrl } from "@/lib/product";
import { getMessages, type Locale } from "@/lib/i18n";

/** 카카오톡 말풍선 모양(로고가 아닌 일반 말풍선) */
function Bubble() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7L5.6 21.3c-.1.4.3.7.6.5l4.2-2.8c.5.1 1 .1 1.6.1 5.5 0 10-3.6 10-8.1S17.5 3 12 3z" />
    </svg>
  );
}

/** 카톡 상담 주소. 카카오톡을 거의 쓰지 않는 나라(대만·홍콩) 화면에서는 숨긴다. */
const chatUrl = (locale?: Locale) => (getMessages(locale).support.showKakao ? kakaoChatUrl() : null);

/** 화면 오른쪽 아래에 떠 있는 카톡 상담 버튼. 채널 주소가 없으면 그리지 않는다. 인쇄(PDF)에는 넣지 않는다. */
export function FloatingKakao({ locale }: { locale?: Locale } = {}) {
  const url = chatUrl(locale);
  if (!url) return null;
  const s = getMessages(locale).support;
  return (
    <a className="kakao-float no-print" href={url} target="_blank" rel="noopener" aria-label={s.kakaoFloatAria}>
      <Bubble />
      <span>{s.kakaoFloat}</span>
    </a>
  );
}

/** 상담 안내: 카톡 1:1 상담(설정된 경우)과 이메일 문의. */
export function SupportBox({ compact = false, locale }: { compact?: boolean; locale?: Locale }) {
  const s = getMessages(locale).support;
  const url = chatUrl(locale);
  const email = BUSINESS.email;
  return (
    <div className={`support-box no-print${compact ? " compact" : ""}`}>
      {!compact && <p className="support-lead">{s.lead(Boolean(url))}</p>}
      <div className="support-actions">
        {url && (
          <a className="kakao-btn" href={url} target="_blank" rel="noopener">
            <Bubble />
            {s.kakao}
          </a>
        )}
        {email && (
          <a className="mail-btn" href={`mailto:${email}?subject=${encodeURIComponent(s.mailSubject)}`}>
            {s.mail(email)}
          </a>
        )}
      </div>
    </div>
  );
}
