"use client";

import { useState } from "react";

/** 주문 한 건의 파일(PDF·HTML)을 다시 보낸다. 감정서를 마저 쓰고 파일을 만드느라 1~3분 걸릴 수 있다. */
export default function AdminResend({ orderId }: { orderId: string }) {
  const [state, setState] = useState<string | null>(null);
  return (
    <span>
      <button
        type="button"
        className="btn-link"
        disabled={state === "보내는 중…"}
        onClick={async () => {
          setState("보내는 중…");
          const res = await fetch("/api/admin/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) }).catch(() => null);
          const data = await res?.json().catch(() => ({}));
          setState(res?.ok ? (data.outcome === "sent" ? "보냈습니다. 새로고침하면 기록이 보입니다." : `결과: ${data.outcome}`) : (data?.error ?? "실패"));
        }}
      >
        다시 보내기
      </button>
      {state && <small className="muted"> {state}</small>}
    </span>
  );
}
