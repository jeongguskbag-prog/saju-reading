"use client";

import { useState } from "react";
import YearField from "./YearField";
import { MOBILE_RE } from "@/lib/phone";
import { loadSdk } from "./PurchaseBox";

type Target = "email" | "kakao" | "sms";
const TARGET_LABEL: Record<Target, string> = { email: "이메일", kakao: "카카오톡", sms: "문자" };
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PHONE_RE = MOBILE_RE;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface GiftProductOption {
  id: string;
  name: string;
  price: number;
  summary: string;
}

/** 받을 곳(이메일·카카오톡·문자) 고르기와 연락처 */
function ContactFields({
  targets,
  offered,
  setTargets,
  email,
  setEmail,
  phone,
  setPhone,
  who,
}: {
  targets: Target[];
  offered: Target[];
  setTargets: (t: Target[]) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  who: string;
}) {
  return (
    <>
      <div className="field">
        <label htmlFor="gift-phone">{who} 휴대폰 번호 (필수)</label>
        <input id="gift-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" autoComplete="tel" />
      </div>
      <div className="field">
        <label htmlFor="gift-email">{who} 이메일 (선택)</label>
        <input id="gift-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email" />
      </div>
      <div className="field">
        <span className="label">받을 곳 (여러 곳 고를 수 있어요)</span>
        <div className="segmented" role="group" aria-label="받을 곳">
          {offered.map((t) => (
            <button key={t} type="button" aria-pressed={targets.includes(t)} onClick={() => setTargets(targets.includes(t) ? targets.filter((x) => x !== t) : [...targets, t])}>
              {TARGET_LABEL[t]}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function checkContact(targets: Target[], email: string, phone: string): string | null {
  const p = phone.replace(/[\s-]/g, "");
  if (!p) return "휴대폰 번호를 적어 주세요.";
  if (!PHONE_RE.test(p)) return "휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)";
  if (email.trim() && !EMAIL_RE.test(email.trim())) return "이메일 주소를 확인해 주세요.";
  if (!targets.length) return "받을 곳을 하나 이상 골라 주세요.";
  if (targets.includes("email") && !email.trim()) return "이메일로 받으시려면 이메일 주소를 적어 주세요.";
  return null;
}

/** 선물 사기: 상품·보내는 분·받는 분·메시지·결제 */
export function GiftBuyForm({ products, offered, testMode }: { products: GiftProductOption[]; offered: Target[]; testMode: boolean }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [targets, setTargets] = useState<Target[]>(offered.includes("sms") ? ["sms"] : ["email"]);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const product = products.find((p) => p.id === productId);

  async function onBuy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!from.trim()) return setError("보내는 분 이름을 적어 주세요.");
    if (!to.trim()) return setError("받는 분 이름을 적어 주세요.");
    const bad = checkContact(targets, email, phone);
    if (bad) return setError(bad);
    if (!agree) return setError("주문 내용과 환불 안내에 동의해 주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/gift/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, from: from.trim(), to: to.trim(), message: message.trim(), email: email.trim(), phone: phone.trim(), targets, agree }),
      });
      const order = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(order.error ?? "주문을 만들지 못했습니다.");
      const TossPayments = await loadSdk();
      await TossPayments(order.clientKey)
        .payment({ customerKey: order.customerKey })
        .requestPayment({
          method: "CARD",
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
      const code = (err as { code?: string }).code;
      setError(code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED" ? "결제를 취소했습니다." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-grid gift-form" onSubmit={onBuy} noValidate>
      <fieldset className="plan-pick">
        <legend className="label">선물할 감정서</legend>
        {products.map((p) => (
          <label key={p.id} className={`plan-option${p.id === productId ? " on" : ""}`}>
            <input type="radio" name="gift-product" value={p.id} checked={p.id === productId} onChange={() => setProductId(p.id)} />
            <span className="plan-name">{p.name}</span>
            <span className="plan-price">{p.price.toLocaleString("ko-KR")}원</span>
            <span className="plan-sum">{p.summary}</span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="gift-from">보내는 분 이름</label>
        <input id="gift-from" type="text" maxLength={20} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="예: 큰딸 지영" />
      </div>
      <div className="field">
        <label htmlFor="gift-to">받는 분 이름</label>
        <input id="gift-to" type="text" maxLength={20} value={to} onChange={(e) => setTo(e.target.value)} placeholder="예: 어머니" />
      </div>
      <div className="field">
        <label htmlFor="gift-message">함께 전할 말 (선택)</label>
        <textarea id="gift-message" rows={3} maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="새해에도 늘 건강하세요." />
      </div>
      <p className="label">결제 확인과 선물 링크를 받으실 곳</p>
      <ContactFields targets={targets} offered={offered} setTargets={setTargets} email={email} setEmail={setEmail} phone={phone} setPhone={setPhone} who="보내는 분" />
      <label className="check purchase-agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          <a href="/terms" target="_blank" rel="noopener">이용약관</a>·<a href="/refund" target="_blank" rel="noopener">환불 규정</a>·
          <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a>을 확인했습니다. 받는 분이 선물을 받기 전에는 취소를 요청하면 전액 환불되며,
          받는 분에게 감정서가 발송된 뒤에는 환불되지 않는다는 데 동의합니다.
        </span>
      </label>
      {error && (
        <p className="error purchase-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn-primary" type="submit" disabled={busy || !product}>
        {busy ? "결제창을 여는 중…" : product ? `${product.price.toLocaleString("ko-KR")}원 결제하고 선물하기` : "감정서를 골라 주세요"}
      </button>
      <p className="muted">
        결제가 끝나면 선물 링크가 만들어집니다. 그 링크를 받는 분께 카카오톡·문자로 전해 주세요. 받는 분이 링크에서 생년월일시를 넣으면 명식 미리보기가 바로
        열리고, 감정서 본문은 정해진 시간 뒤 받는 분께 보내 드립니다.
      </p>
      {testMode && <p className="muted">테스트 결제 모드입니다. 실제로 돈이 빠져나가지 않습니다.</p>}
    </form>
  );
}

/** 사는 분: 결제 직후 선물 링크 복사·공유 */
export function GiftShare({ url, to }: { url: string; to: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }
  async function share() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) await nav.share({ title: "천기록 감정서 선물", text: `${to} 님께 천기록 감정서를 선물합니다. 링크에서 생년월일시를 넣어 받아 주세요.`, url }).catch(() => {});
    else copy();
  }
  return (
    <div className="gift-share">
      <input className="gift-link" type="text" readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="선물 링크" />
      <div className="gift-share-actions">
        <button type="button" className="btn-primary" onClick={share}>
          카카오톡·문자로 보내기
        </button>
        <button type="button" className="btn-secondary" onClick={copy}>
          {copied ? "링크를 복사했습니다" : "링크 복사"}
        </button>
      </div>
    </div>
  );
}

/** 받는 분: 생년월일시와 받을 곳을 넣어 선물 받기 */
export function GiftRedeemForm({ code, toName, offered }: { code: string; toName: string; offered: Target[] }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [calendar, setCalendar] = useState<"solar" | "lunar">("solar");
  const [leap, setLeap] = useState(false);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [unknown, setUnknown] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [targets, setTargets] = useState<Target[]>(offered.includes("sms") ? ["sms"] : ["email"]);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("감정서에 들어갈 성함을 적어 주세요.");
    if (!gender) return setError("성별을 골라 주세요.");
    const missing = [!/^\d{4}$/.test(year) && "태어난 해", !month && "달", !day && "날", !unknown && !hour && "태어난 시(모르면 '모름' 체크)"].filter(Boolean);
    if (missing.length) return setError(`${missing.join(", ")}을(를) 골라 주세요.`);
    const bad = checkContact(targets, email, phone);
    if (bad) return setError(bad);
    if (!agree) return setError("개인정보 수집·이용에 동의해 주세요.");
    setBusy(true);
    try {
      const res = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          input: {
            name: name.trim(),
            gender,
            calendar,
            ...(calendar === "lunar" ? { isLeapMonth: leap } : {}),
            year: Number(year),
            month: Number(month),
            day: Number(day),
            hour: unknown ? null : Number(hour),
            minute: unknown ? null : Number(minute || 0),
          },
          email: email.trim(),
          phone: phone.trim(),
          targets,
          agree,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "선물을 받지 못했습니다.");
      location.href = data.url;
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form className="form-grid gift-form" onSubmit={onSubmit} noValidate>
      <div className="field">
        <label htmlFor="rd-name">성함</label>
        <input id="rd-name" type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder={toName || "홍길동"} />
      </div>
      <div className="field">
        <span className="label">성별</span>
        <div className="segmented" role="group" aria-label="성별">
          <button type="button" aria-pressed={gender === "female"} onClick={() => setGender("female")}>여성</button>
          <button type="button" aria-pressed={gender === "male"} onClick={() => setGender("male")}>남성</button>
        </div>
      </div>
      <div className="field">
        <span className="label">생년월일</span>
        <div className="segmented" role="group" aria-label="양력·음력" style={{ marginBottom: 8 }}>
          <button type="button" aria-pressed={calendar === "solar"} onClick={() => setCalendar("solar")}>양력</button>
          <button type="button" aria-pressed={calendar === "lunar"} onClick={() => setCalendar("lunar")}>음력</button>
        </div>
        <div className="row">
          <YearField value={year} onChange={setYear} />
          <select aria-label="태어난 달" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="" disabled>월</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}월</option>
            ))}
          </select>
          <select aria-label="태어난 날" value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="" disabled>일</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}일</option>
            ))}
          </select>
        </div>
        {calendar === "lunar" && (
          <label className="check" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={leap} onChange={(e) => setLeap(e.target.checked)} /> 윤달
          </label>
        )}
      </div>
      <div className="field">
        <span className="label">태어난 시각</span>
        <div className="row">
          <select aria-label="태어난 시" value={hour} disabled={unknown} onChange={(e) => { setHour(e.target.value); if (!minute) setMinute("0"); }}>
            <option value="" disabled>시</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}시</option>
            ))}
          </select>
          <select aria-label="태어난 분" value={minute} disabled={unknown} onChange={(e) => setMinute(e.target.value)}>
            <option value="" disabled>분</option>
            {MINUTES.map((m) => (
              <option key={m} value={m}>{m}분</option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} /> 모름
          </label>
        </div>
      </div>
      <p className="label">감정서를 받으실 곳</p>
      <ContactFields targets={targets} offered={offered} setTargets={setTargets} email={email} setEmail={setEmail} phone={phone} setPhone={setPhone} who="받는 분" />
      <label className="check purchase-agree">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          감정서 작성과 발송을 위해 입력한 정보를 쓰는 데 동의합니다(<a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a>).
        </span>
      </label>
      {error && (
        <p className="error purchase-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "선물을 받는 중…" : "선물 받기"}
      </button>
      <p className="muted">한 번 받은 선물은 생년월일시를 바꿀 수 없으니 정확히 넣어 주세요. 받는 즉시 명식 미리보기가 열리고, 감정서 본문은 정해진 시간 뒤 보내 드립니다.</p>
    </form>
  );
}
