// 휴대폰 앱 안의 브라우저(카카오톡·네이버·인스타그램 등) 알아보기. 이런 곳에서는 파일 내려받기가 막혀 있는 경우가 많다.
export type InAppKind = "kakao" | "android" | "ios" | null;

export function inAppBrowser(ua: string): InAppKind {
  // 이름이 알려진 앱만 본다. 일반 WebView(; wv) 표시는 우리 천기록 앱에도 붙으므로 보지 않는다.
  const inApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|everytimeApp|BAND\//i.test(ua);
  if (!inApp) return null;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  return /Android/i.test(ua) ? "android" : "ios";
}

export const isMobile = (ua: string) => /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

/** 바깥 브라우저(크롬·사파리)로 이 주소를 여는 링크. iOS의 카카오톡 외 앱은 방법이 없어 null. */
export function externalOpenUrl(kind: InAppKind, url: string): string | null {
  if (kind === "kakao") return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  if (kind === "android") {
    const u = new URL(url);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
  }
  return null;
}
