"use client";

import { useState } from "react";

/** 이번 달 운세 메일을 지금 보내기(이미 받은 회원은 건너뜀). 두 번 눌러 확인한다. */
export default function AdminMonthlySend() {
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function go() {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 5000);
      return;
    }
    setArmed(false);
    setMsg("보내는 중입니다… (회원 수에 따라 몇 분 걸릴 수 있습니다)");
    const res = await fetch("/api/cron/monthly").catch(() => null);
    const d = ((await res?.json().catch(() => null)) ?? {}) as { sent?: number; skipped?: number; failed?: number; done?: boolean; error?: string };
    setMsg(res?.ok ? `보냄 ${d.sent ?? 0} · 건너뜀 ${d.skipped ?? 0} · 실패 ${d.failed ?? 0}${d.done ? "" : " · 메일 설정을 확인하거나 다시 눌러 이어서 보내세요"}` : (d.error ?? "보내지 못했습니다."));
  }
  return (
    <p>
      <button type="button" className="btn-link" onClick={go}>
        {armed ? "한 번 더 누르면 이번 달 메일을 보냅니다" : "이번 달 메일 지금 보내기"}
      </button>
      {msg && <small className="muted"> {msg}</small>}
    </p>
  );
}
