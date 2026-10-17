"use client";

import { useState } from "react";

/** 주문 조회 화면: 주문번호 + 주문할 때 적은 이메일 또는 휴대폰 번호로 감정서를 다시 연다. */
export default function OrderLookup() {
  const [orderId, setOrderId] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/order-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, contact }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "주문을 찾지 못했습니다.");
      location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="card order-lookup">
      <h2>주문 조회</h2>
      <p className="muted">
        감정서 주소를 잃어버렸거나 파일을 저장하지 못하셨다면, 주문번호와 주문할 때 적은 이메일 또는 휴대폰 번호로 감정서를 다시 열 수 있습니다.
        주문번호는 결제 확인 메일·문자에 있습니다.
      </p>
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label htmlFor="lookup-order">주문번호</label>
          <input id="lookup-order" type="text" value={orderId} maxLength={64} onChange={(e) => setOrderId(e.target.value)} placeholder="CGR-20261017-…" autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="lookup-contact">이메일 또는 휴대폰 번호</label>
          <input id="lookup-contact" type="text" value={contact} maxLength={100} onChange={(e) => setContact(e.target.value)} placeholder="name@example.com 또는 010-1234-5678" />
        </div>
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "찾는 중…" : "감정서 찾기"}
        </button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
