"use client";

import { useEffect, useState } from "react";

/**
 * 주문 엑셀(CSV) 내려받기. 일반 브라우저는 바로 받고,
 * 천기록 앱(WebView)은 파일을 받지 못하므로 5분짜리 주소를 받아 휴대폰 브라우저(크롬 등)로 넘겨 받는다.
 */
export default function AdminCsvButton() {
  const [inApp, setInApp] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    setInApp(Boolean(window.AndroidBridge));
  }, []);

  async function openInBrowser(e: React.MouseEvent) {
    if (!inApp) return; // 일반 브라우저는 링크 그대로 받는다.
    e.preventDefault();
    setMsg("휴대폰 브라우저로 여는 중…");
    const res = await fetch("/api/admin/orders", { method: "POST" }).catch(() => null);
    const data = ((await res?.json().catch(() => null)) ?? {}) as { path?: string; error?: string };
    if (!res?.ok || !data.path) return setMsg(data.error ?? "다운로드 주소를 받지 못했습니다. 다시 눌러 주세요.");
    const u = new URL(data.path, location.origin);
    // 앱은 intent:// 주소를 휴대폰 기본 브라우저로 넘긴다. 브라우저가 CSV 파일을 내려받는다.
    location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
    setMsg("휴대폰 브라우저에서 파일을 내려받습니다. 내려받은 파일은 '내 파일 > 다운로드'에 있습니다.");
  }

  return (
    <>
      <a className="btn-secondary link-btn" href="/api/admin/orders" onClick={openInBrowser}>
        엑셀(CSV)로 내려받기
      </a>
      {msg && <p className="muted small">{msg}</p>}
    </>
  );
}
