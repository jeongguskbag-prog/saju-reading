"use client";

import { useEffect, useState } from "react";

/** 감정서 발송 전 신청 취소(전액 환불). 실수로 누르지 않게 두 번 눌러 확인한다(앱 WebView는 confirm 창이 뜨지 않는다). */
export default function CustomerCancel({ token, amountText }: { token: string; amountText: string }) {
  const [armed, setArmed] = useState(false);
  const [state, setState] = useState<{ kind: "busy" | "ok" | "fail"; text: string } | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(t);
  }, [armed]);

  async function cancel() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setState({ kind: "busy", text: "신청을 취소하고 결제를 취소하는 중입니다…" });
    const res = await fetch("/api/orders/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => null);
    const data = ((await res?.json().catch(() => null)) ?? {}) as { error?: string };
    if (res?.ok) setState({ kind: "ok", text: `신청을 취소했습니다. 결제한 ${amountText}은 전액 취소되며, 카드사에 따라 영업일 기준 3~7일 안에 반영됩니다.` });
    else setState({ kind: "fail", text: data.error ?? "취소하지 못했습니다. 잠시 뒤 다시 시도하시거나 고객센터로 문의해 주세요." });
  }

  if (state?.kind === "ok") {
    return (
      <div className="customer-cancel done" role="status">
        <p>✓ {state.text}</p>
        <a className="btn-secondary link-btn" href="/">
          처음으로
        </a>
      </div>
    );
  }
  return (
    <div className="customer-cancel">
      <p className="muted small">
        감정서를 보내 드리기 전까지는 신청을 취소하고 전액 환불받을 수 있습니다. 감정서를 보내 드린 뒤에는 취소·환불되지 않습니다.
      </p>
      <button type="button" className={armed ? "btn-danger" : "btn-link"} onClick={cancel} disabled={state?.kind === "busy"}>
        {state?.kind === "busy" ? "취소하는 중…" : armed ? "한 번 더 누르면 신청이 취소됩니다" : "신청 취소하기 (전액 환불)"}
      </button>
      {state?.kind === "fail" && (
        <p className="error" role="alert">
          {state.text}
        </p>
      )}
    </div>
  );
}
