"use client";

import { useEffect, useState } from "react";

/**
 * 운영자용 바로가기(오른쪽 위, 화면을 내려도 따라온다).
 * - home: 홈페이지에서 앱 화면·관리자로. 손님 화면이라 천기록 앱(AndroidBridge) 안에서 볼 때만 보인다.
 * - admin: 관리자 화면에서 앱 화면·홈페이지로. 관리자 화면은 비밀번호로 잠겨 있어 항상 보인다.
 */
export default function OwnerLinks({ mode }: { mode: "home" | "admin" }) {
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(Boolean(window.AndroidBridge)), []);
  if (mode === "home" && !inApp) return null;
  return (
    <nav className="owner-links no-print" aria-label="바로가기">
      <a href="/app">앱 화면</a>
      {mode === "home" ? <a href="/admin">관리자</a> : <a href="/">홈페이지</a>}
    </nav>
  );
}
