// 화면에서 방문 단계를 알린다(개인정보 없음). 방문자 번호는 이 브라우저에만 남는 임의 값이다.
export function trackClient(step: "visit" | "chart" | "choose"): void {
  try {
    let vid = "";
    try {
      vid = localStorage.getItem("cg-vid") ?? "";
      if (!vid) {
        vid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
        localStorage.setItem("cg-vid", vid);
      }
    } catch {
      vid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    }
    const body = JSON.stringify({ step, vid });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // 측정 실패는 무시
  }
}
