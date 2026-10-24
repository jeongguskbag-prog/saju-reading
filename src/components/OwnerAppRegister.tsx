"use client";

import { useEffect } from "react";
import { isOwnerApp } from "@/lib/export";

/**
 * 관리자용 앱(천기록 관리)이면 서버에 앱 키를 보내 '관리자용 앱' 쿠키를 받는다(관리 화면을 열 수 있게).
 * reload: 받은 뒤 화면을 다시 연다(관리 화면에 처음 들어왔을 때). 관리자용 앱이 아니면 첫 화면으로 보낸다.
 */
export default function OwnerAppRegister({ reload = false }: { reload?: boolean }) {
  useEffect(() => {
    if (!isOwnerApp()) {
      // 웹 브라우저로 관리 화면 주소를 열면 안내 없이 첫 화면으로(뒤로 가기로 돌아오지 않게 replace)
      if (reload) window.location.replace("/");
      return;
    }
    fetch("/api/owner-app", { method: "POST", headers: { "x-app-key": window.AndroidBridge?.appKey?.() ?? "" } })
      .then((r) => r.ok && reload && window.location.reload())
      .catch(() => {});
  }, [reload]);
  return null;
}
