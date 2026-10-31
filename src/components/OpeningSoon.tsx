import { kakaoFriendUrl } from "@/lib/product";

/** 정식 오픈 전(결제가 닫혀 있을 때) 안내: 무료 기능 안내 + 카카오톡 채널로 오픈 소식 받기 */
export default function OpeningSoon({ what = "감정서" }: { what?: string }) {
  const friend = kakaoFriendUrl();
  return (
    <div className="opening-soon">
      <p className="opening-soon-h">
        <b>{what} 정식 오픈을 준비하고 있습니다</b>
      </p>
      <p className="muted">
        오픈하면 이 자리에서 바로 신청하실 수 있습니다. 그동안 무료 사주 풀이, <a href="/today">오늘의 일진</a>, 마이의 오늘·이달의 운세와 길일 달력은 지금
        바로 이용하실 수 있습니다.
      </p>
      {friend && (
        <a className="kakao-channel-btn" href={friend} target="_blank" rel="noopener noreferrer">
          카카오톡 채널 추가하고 오픈 소식 받기
        </a>
      )}
    </div>
  );
}
