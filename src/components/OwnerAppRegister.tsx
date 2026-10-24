"use client";

import { useEffect } from "react";
import { isOwnerApp } from "@/lib/export";

/**
 * 관리자용 앱(천기록 관리)이면 서버에 앱 키를 보내 '관리자용 앱' 쿠키를 받는다(관리 화면을 열 수 있게).
 * reload: 받은 뒤 화면을 다시 연다(관리 화면에 처음 들어왔을 때).
 */
export default function OwnerAppRegister({ reload = false }: { reload?: boolean }) {
  useEffect(() => {
    if (!isOwnerApp()) return;
    fetch("/api/owner-app", { method: "POST", headers: { "x-app-key": window.AndroidBridge?.appKey?.() ?? "" } })
      .then((r) => r.ok && reload && window.location.reload())
      .catch(() => {});
  }, [reload]);
  return null;
}
