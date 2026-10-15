import { BUSINESS, kakaoChatUrl } from "@/lib/product";

/** 카카오톡 말풍선 모양(로고가 아닌 일반 말풍선) */
function Bubble() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="currentColor" d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7L5.6 21.3c-.1.4.3.7.6.5l4.2-2.8c.5.1 1 .1 1.6.1 5.5 0 10-3.6 10-8.1S17.5 3 12 3z" />
    </svg>
  );
}

/** 화면 오른쪽 아래에 떠 있는 카톡 상담 버튼. 채널 주소가 없으면 그리지 않는다. 인쇄(PDF)에는 넣지 않는다. */
export function FloatingKakao() {
  const url = kakaoChatUrl();
  if (!url) return null;
  return (
    <a className="kakao-float no-print" href={url} target="_blank" rel="noopener" aria-label="카카오톡으로 1:1 상담하기">
      <Bubble />
      <span>카톡 상담</span>
    </a>
  );
}

/** 상담 안내: 카톡 1:1 상담(설정된 경우)과 이메일 문의. */
export function SupportBox({ compact = false }: { compact?: boolean }) {
  const url = kakaoChatUrl();
  const email = BUSINESS.email;
  return (
    <div className={`support-box no-print${compact ? " compact" : ""}`}>
      {!compact && (
        <p className="support-lead">
          결제 방법, 생년월일 입력, 감정서 받는 법 등 무엇이든 편하게 물어 주세요.{" "}
          {url ? "카카오톡으로 1:1 상담해 드리며, 그 밖의 문의는 이메일로 받습니다." : "이메일로 문의해 주시면 도와 드립니다."}
        </p>
      )}
      <div className="support-actions">
        {url && (
          <a className="kakao-btn" href={url} target="_blank" rel="noopener">
            <Bubble />
            카카오톡 1:1 상담
          </a>
        )}
        {email && (
          <a className="mail-btn" href={`mailto:${email}?subject=${encodeURIComponent("[천기록] 문의")}`}>
            이메일 문의 {email}
          </a>
        )}
      </div>
    </div>
  );
}
