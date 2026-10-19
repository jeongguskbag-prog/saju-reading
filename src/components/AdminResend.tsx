"use client";

import { useState } from "react";

type State = { kind: "busy" | "ok" | "fail"; text: string } | null;

const OUTCOME: Record<string, string> = {
  sent: "감정서 파일(PDF·HTML)을 보냈습니다. 새로고침하면 발송 기록이 보입니다.",
  already: "이미 보낸 주문입니다.",
  none: "받을 곳(이메일·휴대폰)이 없는 주문이라 보내지 않았습니다.",
  incomplete: "감정서가 아직 다 쓰이지 않아 보내지 못했습니다. 잠시 뒤 다시 눌러 주세요.",
  failed: "보내지 못했습니다. 새로고침한 뒤 '마지막 시도' 칸에서 이유를 확인해 주세요.",
};

/**
 * 주문 한 건의 파일(PDF·HTML)을 다시 보낸다. 공개 전 주문이면 '지금 보내기'(공개 시각을 지금으로 당겨 바로 보낸다). 감정서를 마저 쓰고 파일을 만드느라 1~3분 걸릴 수 있다.
 * 버튼이 표 오른쪽 끝에 있어 결과 글이 가려지기 쉬우므로, 화면 아래 가운데에 안내 창을 띄운다.
 * (Android 앱 WebView는 alert·confirm이 제대로 뜨지 않아 직접 그린다.)
 */
export default function AdminResend({ orderId, name, held = false }: { orderId: string; name?: string; held?: boolean }) {
  const [state, setState] = useState<State>(null);
  const who = name ? `${name} 님 주문` : "이 주문";
  return (
    <span>
      <button
        type="button"
        className="btn-link"
        disabled={state?.kind === "busy"}
        onClick={async () => {
          setState({ kind: "busy", text: `${who}의 감정서 파일을 만들어 보내는 중입니다. 1~3분 걸릴 수 있으니 이 창을 닫지 말고 기다려 주세요.` });
          const res = await fetch("/api/admin/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) }).catch(() => null);
          const data = ((await res?.json().catch(() => null)) ?? {}) as { outcome?: string; error?: string };
          if (res?.ok && data.outcome === "sent") setState({ kind: "ok", text: `${who}: ${OUTCOME.sent}` });
          else if (res?.ok) setState({ kind: data.outcome === "already" ? "ok" : "fail", text: `${who}: ${OUTCOME[data.outcome ?? ""] ?? `결과: ${data.outcome}`}` });
          else setState({ kind: "fail", text: `${who}: ${data.error ?? (res ? `실패(${res.status})` : "인터넷 연결을 확인해 주세요.")}` });
        }}
      >
        {state?.kind === "busy" ? "보내는 중…" : held ? "지금 보내기" : "다시 보내기"}
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
