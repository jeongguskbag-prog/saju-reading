"use client";

import { useState } from "react";
import type { BirthInput } from "@/lib/saju/calc";
import { SupportBox } from "./SupportLinks";
import SamplePreview from "./SamplePreview";
import NamingFields, { emptyNamingForm, toNamingRequest, type NamingForm } from "./NamingFields";
import { DEFAULT_PRODUCT, PRODUCTS, REPORT_VALID_DAYS, sellableProducts, withProductYears, won, type ProductId } from "@/lib/product";

export interface CheckoutInfo {
  enabled: boolean;
  testMode: boolean;
  /** 휴대폰 결제를 열었는지(토스 계약 후 TOSS_MOBILE_PHONE=1) */
  mobilePhone: boolean;
  /** 감정서 링크를 문자로 받을 수 있는지(솔라피 설정) */
  sms?: boolean;
  /** 카카오톡 알림톡으로 받을 수 있는지(솔라피 + 카카오 채널·템플릿) */
  kakao?: boolean;
}

type PayMethod = "CARD" | "MOBILE_PHONE";
type Target = "email" | "kakao" | "sms";
const TARGET_LABEL: Record<Target, string> = { email: "이메일", kakao: "카카오톡", sms: "문자" };

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

/** 무료 결과의 등급 카드 아래: 감정서를 고르고, 성함·이메일을 받아 토스 결제창을 연다. */
export default function PurchaseBox({ input, checkout, years }: { input: BirthInput; checkout: CheckoutInfo; years: [number, number] }) {
  const products = sellableProducts();
  const [productId, setProductId] = useState<ProductId>(DEFAULT_PRODUCT);
  const [name, setName] = useState(input.name ?? "");
  const [email, setEmail] = useState("");
  // 받는 곳: 이메일·카카오톡·문자 가운데 원하는 곳을 모두 고른다. 고른 곳 모두로 보낸다.
  const [targets, setTargets] = useState<Target[]>(["email"]);
  const [phone, setPhone] = useState("");
  const offered: Target[] = ["email", ...(checkout.kakao ? (["kakao"] as const) : []), ...(checkout.sms ? (["sms"] as const) : [])];
  const picked = targets.filter((t) => offered.includes(t));
  const byEmail = picked.includes("email");
  const phoneTargets = picked.filter((t): t is "kakao" | "sms" => t !== "email");
  const toggleTarget = (t: Target) => setTargets((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const [agree, setAgree] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("CARD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [naming, setNaming] = useState<NamingForm>(emptyNamingForm);
  const product = PRODUCTS[productId];
  const isNaming = productId === "naming";

  async function onBuy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let namingReq: unknown;
    if (isNaming) {
      const r = toNamingRequest(naming);
      if (!r.ok) return setError(r.error);
      namingReq = r.value;
    }
    // 작명록은 아기 이름이 아직 없으니 "김○○", 개명은 지금 이름으로 표지에 적는다.
    const reportName = isNaming
      ? naming.mode === "rename"
        ? `${naming.surname.trim()}${naming.currentHangul.trim()}`
        : `${naming.surname.trim()}○○`
      : name.trim();
    if (!reportName) return setError("감정서에 들어갈 성함을 적어 주세요.");
    if (!picked.length) return setError("감정서를 받을 곳(이메일·카카오톡·문자)을 하나 이상 골라 주세요.");
    if (byEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setError("감정서를 받을 이메일 주소를 확인해 주세요.");
    if (phoneTargets.length && !/^01[016789]\d{7,8}$/.test(phone.replace(/[\s-]/g, ""))) {
      return setError("감정서를 받을 휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)");
    }
    if (!agree) return setError("주문 내용과 청약철회 안내에 동의해 주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { ...input, name: reportName },
          email: byEmail ? email.trim() : "",
          ...(phoneTargets.length ? { phone: phone.trim(), channels: phoneTargets } : {}),
          agree,
          productId,
          ...(isNaming ? { naming: namingReq } : {}),
        }),
      });
      const order = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(order.error ?? "주문을 만들지 못했습니다.");
      const TossPayments = await loadSdk();
      const payment = TossPayments(order.clientKey).payment({ customerKey: order.customerKey });
      await payment.requestPayment({
        method: checkout.mobilePhone ? payMethod : "CARD",
        amount: { currency: "KRW", value: order.amount },
        orderId: order.orderId,
        orderName: order.orderName,
        successUrl: `${location.origin}/pay/success`,
        failUrl: `${location.origin}/pay/fail`,
        ...(order.customerEmail ? { customerEmail: order.customerEmail } : {}),
        ...(order.customerMobilePhone ? { customerMobilePhone: order.customerMobilePhone } : {}),
        customerName: order.customerName,
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
      <h2 id="purchase-h">1:1 맞춤 감정서 신청</h2>
      <p className="purchase-lead">
        이 명식을 바탕으로 의뢰인 한 분만을 위한 감정서를 써서 책자로 엮어 드립니다. 결제하면 바로 작성을 시작해 약 3분 뒤
        이 화면에서 감정서를 보실 수 있고, 신청 10분 뒤 고르신 곳(이메일·카카오톡·문자)으로 PDF 파일과 HTML 파일을 보내 드립니다.
      </p>
      {checkout.enabled ? (
        <form className="form-grid" onSubmit={onBuy} noValidate>
          <fieldset className="plan-pick">
            <legend className="label">감정서 고르기</legend>
            {products.map((p) => (
              <label key={p.id} className={`plan-option${productId === p.id ? " on" : ""}`}>
                <input type="radio" name="product" value={p.id} checked={productId === p.id} onChange={() => setProductId(p.id)} />
                <span className="plan-name">{p.name}</span>
                <span className="plan-price">{won(p.price)}</span>
                <span className="plan-sum">{withProductYears(p.summary, years)}</span>
              </label>
            ))}
          </fieldset>
          <SamplePreview productId={productId} />
          {isNaming ? (
            <NamingFields value={naming} onChange={setNaming} />
          ) : (
            <div className="field">
              <label htmlFor="buy-name">의뢰인 성함</label>
              <input id="buy-name" type="text" autoComplete="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
            </div>
          )}
          {offered.length > 1 && (
            <div className="field">
              <span className="label">감정서 받는 곳 (여러 곳을 고르면 모두 보내 드립니다)</span>
              <div className="chip-row" role="group" aria-label="감정서 받는 곳">
                {offered.map((t) => (
                  <button key={t} type="button" className="chip" aria-pressed={picked.includes(t)} onClick={() => toggleTarget(t)}>
                    {picked.includes(t) ? "✓ " : ""}
                    {TARGET_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {byEmail && (
            <div className="field">
              <label htmlFor="buy-email">감정서를 받을 이메일</label>
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
              <p className="muted">PDF 파일과 HTML 파일을 메일에 첨부해 보내 드립니다.</p>
            </div>
          )}
          {phoneTargets.length > 0 && (
            <div className="field">
              <label htmlFor="buy-phone">{phoneTargets.map((t) => TARGET_LABEL[t]).join("·")}{phoneTargets[phoneTargets.length - 1] === "sms" ? "로" : "으로"} 받을 휴대폰 번호</label>
              <input
                id="buy-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                maxLength={20}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
              />
              <p className="muted">
                감정서 링크와 PDF·HTML 파일 받기 링크를 보내 드립니다.
                {phoneTargets.includes("kakao") && !phoneTargets.includes("sms") ? " 카카오톡을 쓰지 않는 번호면 같은 내용이 문자로 갑니다." : ""}
              </p>
            </div>
          )}
          {checkout.mobilePhone && (
            <div className="field">
              <span className="label">결제 수단</span>
              <div className="segmented" role="group" aria-label="결제 수단">
                <button type="button" aria-pressed={payMethod === "CARD"} onClick={() => setPayMethod("CARD")}>
                  카드·간편결제
                </button>
                <button type="button" aria-pressed={payMethod === "MOBILE_PHONE"} onClick={() => setPayMethod("MOBILE_PHONE")}>
                  휴대폰 결제
                </button>
              </div>
            </div>
          )}
          <label className="check purchase-agree">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>
              위 생년월일시로 감정서를 만드는 데 동의하고,{" "}
              <a href="/terms" target="_blank" rel="noopener">이용약관</a>·<a href="/refund" target="_blank" rel="noopener">환불 규정</a>·
              <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a>을 확인했습니다. 감정서는 결제 즉시 작성되는 디지털
              콘텐츠라 작성이 시작된 뒤에는 청약철회가 제한됩니다.
            </span>
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "결제창을 여는 중…" : `${won(product.price)} 결제하고 감정서 신청`}
          </button>
          <p className="purchase-time">
            ⏳ 결제 후 명식 계산, 각 부의 풀이 작성, 책자 편집을 거쳐 <b>약 3분 뒤</b> 화면에서 감정서가 열리고,
            <b>신청 10분 뒤</b> 감정서 PDF 파일과 HTML 파일을 보내 드립니다. 창을 닫으셔도 작성과 발송은 이어집니다.
          </p>
          <p className="muted">감정서 링크는 결제일로부터 {REPORT_VALID_DAYS}일 동안 열 수 있습니다. 기간 안에 PDF로 저장해 두세요.</p>
          {checkout.testMode && <p className="muted">테스트 결제 모드입니다. 실제로 돈이 빠져나가지 않습니다.</p>}
          <SupportBox compact />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <>
          <p className="muted">감정서 결제는 준비 중입니다. 열리면 이 자리에서 바로 신청할 수 있습니다.</p>
          {/* 결제가 닫혀 있어도 견본은 먼저 볼 수 있게 한다. */}
          <SamplePreview />
          <SupportBox compact />
        </>
      )}
    </section>
  );
}
