"use client";

import { useEffect, useRef, useState } from "react";
import { loadSdk } from "./PurchaseBox";

export interface ConsultProfile {
  id: string;
  name: string;
  line: string;
  self: boolean;
}
type Turn = { q: string; a: string; at?: string };
type Pack = { id: string; count: number; price: number; name: string };

const EXAMPLES = ["올해 이직해도 괜찮을까요?", "돈이 들어오는 시기는 언제쯤인가요?", "올해 연애운은 어떤가요?", "저에게 맞는 일의 방식은 무엇인가요?"];

/** AI 사주 상담 화면: 사주 고르기, 대화, 질문권 구매 */
export default function ConsultChat({
  profiles,
  initialLeft,
  packs,
  checkoutOpen,
  testMode,
  justPaid,
}: {
  profiles: ConsultProfile[];
  initialLeft: number;
  packs: Pack[];
  checkoutOpen: boolean;
  testMode: boolean;
  justPaid: boolean;
}) {
  const [profileId, setProfileId] = useState(profiles.find((p) => p.self)?.id ?? profiles[0]?.id ?? "");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [left, setLeft] = useState(initialLeft);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState<Turn | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needPurchase, setNeedPurchase] = useState(initialLeft <= 0);
  const [agree, setAgree] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // 천기록 앱(사장님용)은 질문권 없이 질문한다(서버가 앱 키로 확인).
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    setInApp(Boolean(window.AndroidBridge?.appKey?.()));
  }, []);

  useEffect(() => {
    if (!profileId) return;
    setTurns([]);
    fetch(`/api/consult?profileId=${encodeURIComponent(profileId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.turns)) setTurns(d.turns);
        if (typeof d.left === "number") setLeft(d.left);
      })
      .catch(() => {});
  }, [profileId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pending?.a]);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setError(null);
    setBusy(true);
    setPending({ q: text, a: "" });
    setQuestion("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const appKey = window.AndroidBridge?.appKey?.();
      if (appKey) headers["x-app-key"] = appKey;
      const res = await fetch("/api/consult", { method: "POST", headers, body: JSON.stringify({ profileId, question: text }) });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        if (d.needPurchase) setNeedPurchase(true);
        throw new Error(d.error ?? "질문을 보내지 못했습니다.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let answer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as { t: string; v?: string; left?: number; message?: string };
          if (ev.t === "d" && ev.v) {
            answer += ev.v;
            setPending({ q: text, a: answer });
          } else if (ev.t === "done") {
            setTurns((t) => [...t, { q: text, a: answer.trim() }]);
            if (typeof ev.left === "number") {
              setLeft(ev.left);
              if (ev.left <= 0) setNeedPurchase(true);
            }
          } else if (ev.t === "error") {
            throw new Error(ev.message ?? "답을 받지 못했습니다.");
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setQuestion(text);
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  async function buy(packId: string) {
    setError(null);
    if (!agree) return setError("구매 내용과 환불 안내에 동의해 주세요.");
    setBuying(packId);
    try {
      const res = await fetch("/api/consult/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ packId, profileId, agree }) });
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
          customerName: order.customerName,
        });
    } catch (err) {
      const code = (err as { code?: string }).code;
      setError(code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED" ? "결제를 취소했습니다." : (err as Error).message);
    } finally {
      setBuying(null);
    }
  }

  async function clear() {
    if (!profileId) return;
    await fetch(`/api/consult?profileId=${encodeURIComponent(profileId)}`, { method: "DELETE" }).catch(() => null);
    setTurns([]);
  }

  const shown = pending ? [...turns, pending] : turns;

  return (
    <div className="consult">
      {justPaid && <p className="notice">질문권을 넣어 드렸습니다. 이어서 질문해 주세요.</p>}
      <div className="consult-bar">
        <label htmlFor="consult-profile">상담할 사주</label>
        <select id="consult-profile" value={profileId} onChange={(e) => setProfileId(e.target.value)} disabled={busy}>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.line}
            </option>
          ))}
        </select>
        <span className="consult-left">{inApp ? "앱: 질문 무제한" : `남은 질문 ${left}회`}</span>
      </div>

      <div className="consult-log" aria-live="polite">
        {shown.length === 0 && (
          <div className="consult-empty">
            <p>궁금한 것을 편하게 물어보세요. 이 사주의 원국·대운·올해와 내년의 월별 흐름을 근거로 AI가 바로 답합니다.</p>
            <div className="chip-row">
              {EXAMPLES.map((e) => (
                <button key={e} type="button" className="chip" onClick={() => setQuestion(e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {shown.map((t, i) => (
          <div key={i} className="consult-turn">
            <p className="consult-q">{t.q}</p>
            <div className="consult-a">
              {t.a ? t.a.split(/\n{2,}/).map((para, j) => <p key={j}>{para}</p>) : <p className="muted">명식을 살펴보며 답을 쓰고 있습니다…</p>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        className="consult-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="예: 올해 하반기에 창업해도 괜찮을까요?"
          aria-label="질문"
          disabled={busy}
        />
        <div className="consult-form-row">
          <small className="muted">{question.length}/500 · 질문 1회에 질문권 1개</small>
          <button type="submit" className="btn-primary" disabled={busy || question.trim().length < 2 || (left <= 0 && !inApp)}>
            {busy ? "답을 쓰는 중…" : "질문하기"}
          </button>
        </div>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {turns.length > 0 && !busy && (
        <button type="button" className="btn-link" onClick={clear}>
          이 사주의 대화 지우기
        </button>
      )}

      {!inApp && (needPurchase || left <= 3) && (
        <section className="consult-packs" aria-labelledby="packs-h">
          <h2 id="packs-h">질문권</h2>
          {checkoutOpen ? (
            <>
              {testMode && <p className="muted small">지금은 테스트 결제 모드입니다(실제로 돈이 나가지 않습니다).</p>}
              <div className="consult-pack-list">
                {packs.map((p) => (
                  <button key={p.id} type="button" className="consult-pack" onClick={() => buy(p.id)} disabled={Boolean(buying)}>
                    <b>{p.count}회</b>
                    <span>{p.price.toLocaleString("ko-KR")}원</span>
                    <small>1회 {Math.round(p.price / p.count).toLocaleString("ko-KR")}원</small>
                  </button>
                ))}
              </div>
              <label className="consult-agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> 구매 내용과{" "}
                <a href="/refund" target="_blank" rel="noopener">
                  환불 안내
                </a>
                를 확인했습니다. 질문권은 AI 답변을 받을 때 하나씩 쓰이며, 답을 받지 못한 질문은 되돌려 드립니다.
              </label>
            </>
          ) : (
            <p className="muted">질문권 결제를 준비하고 있습니다.</p>
          )}
        </section>
      )}
      <p className="muted small">
        답변은 명식 데이터를 근거로 AI가 작성한 참고 자료이며 미래를 보장하지 않습니다. 건강·법률·투자 같은 중요한 결정은 전문가와 상의해 주세요.
      </p>
    </div>
  );
}
