"use client";

import { useState } from "react";

/** 마이: 매월 1일 '이달의 운세' 메일 받기(광고성 정보 수신 동의) / 그만 받기 */
export default function MyMonthlyMail({ initialEmail }: { initialEmail: string | null }) {
  const [on, setOn] = useState<string | null>(initialEmail);
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function post(body: object) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/me/monthly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = ((await res?.json().catch(() => null)) ?? {}) as { error?: string; on?: boolean; email?: string };
    setBusy(false);
    if (!res?.ok) return setMsg({ ok: false, text: data.error ?? "저장하지 못했습니다." });
    setOn(data.on ? (data.email ?? email) : null);
    setMsg({ ok: true, text: data.on ? "매월 1일 아침에 이달의 운세를 보내 드립니다." : "이달의 운세 메일을 더 보내지 않습니다. 이메일 주소도 지웠습니다." });
  }

  return (
    <section className="card my-monthly-mail" aria-labelledby="monthly-mail-h">
      <h2 id="monthly-mail-h">매월 1일, 이달의 운세 메일</h2>
      {on ? (
        <>
          <p>
            <b>{on}</b>(으)로 매월 1일 아침 &lsquo;내 사주&rsquo; 기준 이달의 운세와 기운이 좋은 날을 보내 드리고 있습니다.
          </p>
          <button type="button" className="btn-link" onClick={() => post({ off: true })} disabled={busy}>
            그만 받기
          </button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void post({ email, agree });
          }}
        >
          <p className="muted">마이의 &lsquo;내 사주&rsquo;로 계산한 이달의 운세와 기운이 좋은 날, 길일 달력 링크를 매월 1일 아침에 보내 드립니다.</p>
          <div className="coupon-row">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" required maxLength={120} aria-label="받을 이메일" />
            <button type="submit" className="btn-secondary" disabled={busy}>
              받기
            </button>
          </div>
          <label className="check">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              (선택) 이달의 운세 메일에는 천기록 감정서·이벤트 안내가 함께 들어갈 수 있어 광고성 정보 수신에 동의합니다. 받을 이메일은 이 메일을 보내는 데만
              쓰며, 메일의 &lsquo;수신 거부&rsquo; 또는 여기서 언제든 끌 수 있고 끄면 바로 지웁니다.
            </span>
          </label>
        </form>
      )}
      {msg && <p className={msg.ok ? "coupon-ok" : "error"}>{msg.text}</p>}
    </section>
  );
}
