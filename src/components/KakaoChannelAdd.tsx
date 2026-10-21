import { kakaoFriendUrl } from "@/lib/product";

/** 카카오톡 채널 친구 추가: 신년 운세·이벤트 소식과 1:1 상담을 카톡으로 받는다. */
export default function KakaoChannelAdd({ text = "신년 운세·할인 소식과 감정서 문의를 카카오톡으로 받아 보세요." }: { text?: string }) {
  const url = kakaoFriendUrl();
  if (!url) return null;
  return (
    <section className="card kakao-channel no-print">
      <p>
        <b>천기록 카카오톡 채널</b>
        <span className="muted">{text}</span>
      </p>
      <a className="kakao-channel-btn" href={url} target="_blank" rel="noopener noreferrer">
        채널 추가
      </a>
    </section>
  );
}
