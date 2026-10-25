import { kakaoChatUrl } from "@/lib/product";

/**
 * 공유 이벤트 안내. Vercel 환경변수 NEXT_PUBLIC_SHARE_EVENT에 안내 문구를 넣으면 공유 카드 아래에 나오고, 비우면 숨긴다(바꾸면 다시 배포).
 * 예: "카드 이미지를 인스타그램 스토리에 올리고 캡처를 카카오톡 채널로 보내 주시면 감정서 20% 할인 쿠폰을 드립니다(11월 30일까지)."
 */
export default function ShareEventNote() {
  const text = (process.env.NEXT_PUBLIC_SHARE_EVENT ?? "").trim();
  if (!text) return null;
  const chat = kakaoChatUrl();
  return (
    <div className="share-event">
      <b>🎁 공유 이벤트</b>
      <p>{text}</p>
      {chat && (
        <a className="kakao-channel-btn" href={chat} target="_blank" rel="noopener noreferrer">
          카카오톡 채널로 인증 보내기
        </a>
      )}
    </div>
  );
}
