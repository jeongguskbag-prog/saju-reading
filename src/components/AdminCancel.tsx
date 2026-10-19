"use client";

import { useEffect, useState } from "react";

/**
 * 결제 취소(전액). 실수로 누르지 않게 두 번 눌러 확인한다(앱 WebView는 confirm 창이 뜨지 않는다).
 * 공개(발송) 전 취소 요청은 전액 환불이 원칙이고, 공개 뒤에는 환불 규정에 따라 판단한다.
 */
export default function AdminCancel({ orderId, name, released }: { orderId: string; name?: string; released: boolean }) {
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState<{ kind: "busy" | "ok" | "fail"; text: string } | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  const who = name ? `${name} 님 주문` : "이 주문";
  async function cancel() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setState({ kind: "busy", text: `${who}의 결제를 취소하는 중입니다…` });
    const res = await fetch("/api/admin/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, reason: "고객 요청" }) }).catch(() => null);
    const data = ((await res?.json().catch(() => null)) ?? {}) as { error?: string };
    if (res?.ok) setState({ kind: "ok", text: `${who}: 결제를 취소했습니다(전액). 감정서는 더 이상 열리지 않고 보내지 않습니다.` });
    else setState({ kind: "fail", text: `${who}: ${data.error ?? "결제를 취소하지 못했습니다."}` });
  }
  return (
    <span>
      <button type="button" className="btn-link admin-cancel" onClick={cancel} disabled={state?.kind === "busy"}>
        {armed ? (released ? "공개 뒤 취소, 한 번 더 누르면 취소" : "한 번 더 누르면 취소") : "결제 취소"}
      </button>
      {state && (
        <div className={`admin-toast ${state.kind}`} role={state.kind === "fail" ? "alert" : "status"} aria-live="polite">
          <p>
            {state.kind === "busy" ? <span className="spinner" aria-hidden /> : state.kind === "ok" ? "✓ " : "✗ "}
            {state.text}
          </p>
          {state.kind !== "busy" && (
            <div className="admin-toast-actions">
              {state.kind === "ok" && (
                <button type="button" className="btn-secondary" onClick={() => location.reload()}>
                  새로고침
                </button>
              )}
              <button type="button" className="btn-link" onClick={() => setState(null)}>
                닫기
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
