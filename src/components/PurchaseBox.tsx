"use client";

import { useState } from "react";
import type { BirthInput } from "@/lib/saju/calc";
import { SupportBox } from "./SupportLinks";
import SamplePreview from "./SamplePreview";
import NamingFields, { emptyNamingForm, toNamingRequest, type NamingForm } from "./NamingFields";
import GunghapFields, { emptyGunghapForm, toGunghapRequest, type GunghapForm } from "./extras/GunghapFields";
import { isExtraKind } from "@/lib/extras/kinds";
import { newyearChoices } from "@/lib/extras/requests";
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

/** 무료 결과의 등급 카드 아래: 감정서를 고르고, 성함을 받아 토스 결제창을 연다. */
export default function PurchaseBox({ input, checkout, years }: { input: BirthInput; checkout: CheckoutInfo; years: [number, number] }) {
  const products = sellableProducts();
  const [productId, setProductId] = useState<ProductId>(DEFAULT_PRODUCT);
  const [name, setName] = useState(input.name ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // 주문번호·결제 내역과 감정서 파일(PDF·HTML)을 받을 곳. 여러 곳을 고르면 모두 보낸다.
  const offered: Target[] = ["email", ...(checkout.kakao ? (["kakao"] as const) : []), ...(checkout.sms ? (["sms"] as const) : [])];
  const [targets, setTargets] = useState<Target[]>(["email"]);
  const picked = targets.filter((t) => offered.includes(t));
  const toggleTarget = (t: Target) => setTargets((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const [agree, setAgree] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>("CARD");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [naming, setNaming] = useState<NamingForm>(emptyNamingForm);
  const product = PRODUCTS[productId];
  const isNaming = productId === "naming";
  const [gunghap, setGunghap] = useState<GunghapForm>(() => emptyGunghapForm(input.gender));
  const isExtra = isExtraKind(productId);
  const yearChoices = newyearChoices();
  // 10월부터는 내년을 먼저 고른다.
  const [newyearYear, setNewyearYear] = useState(() => (new Date().getMonth() >= 9 ? yearChoices[1] : yearChoices[0]));
  const coreProducts = products.filter((p) => !isExtraKind(p.id));
  const extraProducts = products.filter((p) => isExtraKind(p.id));

  async function onBuy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let namingReq: unknown;
    if (isNaming) {
      const r = toNamingRequest(naming);
      if (!r.ok) return setError(r.error);
      namingReq = r.value;
    }
    let extraReq: unknown;
    if (productId === "gunghap") {
      const r = toGunghapRequest(gunghap);
      if (!r.ok) return setError(r.error);
      extraReq = r.value;
    }
    if (productId === "newyear") extraReq = { year: newyearYear };
    // 작명록은 아기 이름이 아직 없으니 "김○○", 개명은 지금 이름으로 표지에 적는다.
    const reportName = isNaming
      ? naming.mode === "rename"
        ? `${naming.surname.trim()}${naming.currentHangul.trim()}`
        : `${naming.surname.trim()}○○`
      : name.trim();
    if (!reportName) return setError("감정서에 들어갈 성함을 적어 주세요.");
    const phoneOk = /^01[016789]\d{7,8}$/.test(phone.replace(/[\s-]/g, ""));
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (email.trim() && !emailOk) return setError("이메일 주소를 확인해 주세요.");
    if (!phone.trim()) return setError("휴대폰 번호를 적어 주세요. (필수)");
    if (!phoneOk) return setError("휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)");
    if (!picked.length) return setError("주문 내역과 감정서 파일을 받을 곳을 하나 이상 골라 주세요.");
    if (picked.includes("email") && !email.trim()) return setError("이메일로 받으시려면 이메일 주소를 적어 주세요.");
    if (picked.some((t) => t !== "email") && !phone.trim()) return setError("카카오톡·문자로 받으시려면 휴대폰 번호를 적어 주세요.");
    if (!agree) return setError("주문 내용과 청약철회 안내에 동의해 주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { ...input, name: reportName },
          email: email.trim(),
          ...(phone.trim() ? { phone: phone.trim() } : {}),
          targets: picked,
          agree,
          productId,
          ...(isNaming ? { naming: namingReq } : {}),
          ...(isExtra ? { extra: extraReq ?? {} } : {}),
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
        화면에 감정서가 열리고, PDF 파일과 HTML 문서로 바로 저장하실 수 있습니다. 주문번호와 결제 내역은 고르신 곳으로 보내 드립니다.
      </p>
      {checkout.enabled ? (
        <form className="form-grid" onSubmit={onBuy} noValidate>
          <fieldset className="plan-pick">
            <legend className="label">감정서 고르기</legend>
            {coreProducts.map((p) => (
              <label key={p.id} className={`plan-option${productId === p.id ? " on" : ""}`}>
                <input type="radio" name="product" value={p.id} checked={productId === p.id} onChange={() => setProductId(p.id)} />
                <span className="plan-name">{p.name}</span>
                <span className="plan-price">{won(p.price)}</span>
                <span className="plan-sum">{withProductYears(p.summary, years)}</span>
              </label>
            ))}
            {extraProducts.length > 0 && (
              <>
                <p className="plan-group">함께 보는 감정서</p>
                {extraProducts.map((p) => (
                  <label key={p.id} className={`plan-option${productId === p.id ? " on" : ""}`}>
                    <input type="radio" name="product" value={p.id} checked={productId === p.id} onChange={() => setProductId(p.id)} />
                    <span className="plan-name">{p.name}</span>
                    <span className="plan-price">{won(p.price)}</span>
                    <span className="plan-sum">{withProductYears(p.summary, years)}</span>
                  </label>
                ))}
              </>
            )}
          </fieldset>
          <SamplePreview productId={productId} />
          {isNaming ? (
            <NamingFields value={naming} onChange={setNaming} />
          ) : (
            <div className="field">
              <label htmlFor="buy-name">{productId === "gunghap" ? "의뢰인(본인) 성함" : "의뢰인 성함"}</label>
              <input id="buy-name" type="text" autoComplete="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
            </div>
          )}
          {productId === "gunghap" && <GunghapFields value={gunghap} onChange={setGunghap} />}
          {productId === "newyear" && (
            <div className="field">
              <span className="label">볼 해</span>
              <div className="segmented" role="group" aria-label="볼 해">
                {yearChoices.map((y) => (
                  <button key={y} type="button" aria-pressed={newyearYear === y} onClick={() => setNewyearYear(y)}>
                    {y}년
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="buy-email">이메일 (선택)</label>
            <input id="buy-email" type="email" inputMode="email" autoComplete="email" value={email} maxLength={100} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>
          <div className="field">
            <label htmlFor="buy-phone">
              휴대폰 번호 <span className="req">(필수)</span>
            </label>
            <input id="buy-phone" type="tel" inputMode="tel" autoComplete="tel" required aria-required="true" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" />
            <p className="muted">적어 주신 이메일·휴대폰 번호와 주문번호로 나중에 감정서를 다시 찾을 수 있습니다(주문 조회).</p>
          </div>
          <div className="field">
            <span className="label">주문 내역과 감정서 파일 받을 곳 (여러 곳 가능)</span>
            <div className="chip-row" role="group" aria-label="주문 내역과 감정서 파일 받을 곳">
              {offered.map((t) => (
                <button key={t} type="button" className="chip" aria-pressed={picked.includes(t)} onClick={() => toggleTarget(t)}>
                  {picked.includes(t) ? "✓ " : ""}
                  {TARGET_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="muted">
              결제가 끝나면 주문번호와 결제 내역을 바로 보내 드리고, 신청 3분 뒤 감정서 PDF 파일과 HTML 문서도 같은 곳으로 보내 드립니다.
            </p>
          </div>
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
            ⏳ 결제 후 명식 계산, 각 부의 풀이 작성, 책자 편집을 거쳐 <b>약 3분 뒤</b> 화면에 감정서가 열립니다.
            열리면 <b>PDF 파일 저장</b>·<b>HTML 문서 저장</b> 버튼으로 바로 내려받으세요. 신청 3분 뒤에는 고르신 곳으로도 두 파일을 보내 드립니다.
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
