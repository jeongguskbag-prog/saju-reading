"use client";

import { useEffect, useState } from "react";

/**
 * 운영자용 바로가기(오른쪽 위, 화면을 내려도 따라온다).
 * - home: 홈페이지에서 앱 화면·관리자로. 손님 화면이라 천기록 앱(AndroidBridge) 안에서 볼 때만 보인다.
 * - admin: 관리자 화면에서 앱 화면·홈페이지로. 관리자 화면은 비밀번호로 잠겨 있어 항상 보인다.
 *   로그인한 상태(loggedIn)면 로그아웃 버튼도 보인다.
 */
export default function OwnerLinks({ mode, loggedIn = false }: { mode: "home" | "admin"; loggedIn?: boolean }) {
  const [inApp, setInApp] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => setInApp(Boolean(window.AndroidBridge)), []);
  if (mode === "home" && !inApp) return null;

  async function logout() {
    if (!window.confirm("관리자에서 로그아웃할까요?")) return;
    setLeaving(true);
    // 로그인 쿠키를 지운 뒤 관리자 화면을 다시 열면 비밀번호 입력 화면이 나온다.
    await fetch("/api/admin/login", { method: "DELETE" }).catch(() => null);
    window.location.replace("/admin");
  }

  return (
    <nav className="owner-links no-print" aria-label="바로가기">
      <a href="/app">앱 화면</a>
      {mode === "home" ? <a href="/admin">관리자</a> : <a href="/">홈페이지</a>}
      {mode === "admin" && loggedIn && (
        <button type="button" className="owner-logout" onClick={logout} disabled={leaving}>
          {leaving ? "로그아웃 중…" : "로그아웃"}
        </button>
      )}
    </nav>
  );
}
