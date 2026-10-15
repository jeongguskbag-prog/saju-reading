"use client";

import { useState } from "react";
import type { BirthInput } from "@/lib/saju/calc";
import { PRODUCT, won } from "@/lib/product";

export interface CheckoutInfo {
  enabled: boolean;
  price: number;
  testMode: boolean;
}

interface TossPaymentsInstance {
  payment(opts: { customerKey: string }): {
    requestPayment(opts: Record<string, unknown>): Promise<void>;
  };
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

const SDK_URL = "https://js.tosspayments.com/v2/standard";

function loadSdk(): Promise<NonNullable<Window["TossPayments"]>> {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error("결제 모듈을 불러오지 못했습니다.")));
    s.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요."));
    document.head.appendChild(s);
  });
}

/** 무료 결과의 등급 카드 아래: 이메일을 받고 토스 결제창을 연다. */
export default function PurchaseBox({ input, checkout }: { input: BirthInput; checkout: CheckoutInfo }) {
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onBuy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError("리포트 링크를 받을 이메일 주소를 확인해 주세요.");
    if (!agree) return setError("주문 내용과 청약철회 안내에 동의해 주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, email: email.trim(), agree }),
      });
      const order = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(order.error ?? "주문을 만들지 못했습니다.");
      const TossPayments = await loadSdk();
      const payment = TossPayments(order.clientKey).payment({ customerKey: order.customerKey });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${location.origin}/pay/success`,
        failUrl: `${location.origin}/pay/fail`,
        customerEmail: order.customerEmail,
        ...(input.name ? { customerName: input.name } : {}),
      });
    } catch (err) {
      // 결제창을 닫은 경우 등. 화면에 남아 다시 시도할 수 있게 한다.
      const code = (err as { code?: string }).code;
      setError(code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED" ? "결제를 취소했습니다." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card purchase no-print" aria-labelledby="purchase-h">
      <h2 id="purchase-h">{PRODUCT.name}</h2>
      <p className="purchase-lead">
        이 명식을 바탕으로 다섯 부의 풀이를 써서 한 권으로 엮어 드립니다. 0세부터의 대운, 재물과 인연, 올해·내년 월별 흐름과 개운법까지
        담기고, 링크로 언제든 다시 열거나 PDF로 저장할 수 있습니다.
      </p>
      <p className="purchase-price">{won(checkout.price)}</p>
      {checkout.enabled ? (
        <form className="form-grid" onSubmit={onBuy} noValidate>
          <div className="field">
            <label htmlFor="buy-email">리포트 링크를 받을 이메일</label>
            <input
              id="buy-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              maxLength={100}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <label className="check purchase-agree">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              위 생년월일시로 리포트를 만드는 데 동의하고,{" "}
              <a href="/terms" target="_blank" rel="noopener">이용약관</a>·<a href="/refund" target="_blank" rel="noopener">환불 규정</a>·
              <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a>을 확인했습니다. 리포트는 결제 즉시 작성되는 디지털
              콘텐츠라 작성이 시작된 뒤에는 청약철회가 제한됩니다.
            </span>
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "결제창을 여는 중…" : `${won(checkout.price)} 결제하고 리포트 받기`}
          </button>
          {checkout.testMode && <p className="muted">테스트 결제 모드입니다. 실제로 돈이 빠져나가지 않습니다.</p>}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <p className="muted">결제는 준비 중입니다. 열리면 이 자리에서 바로 받을 수 있습니다.</p>
      )}
    </section>
  );
}
