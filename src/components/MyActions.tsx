"use client";

import { useEffect, useState } from "react";
import { PENDING_PROFILE_KEY } from "./MemberSaveBar";

async function call(url: string, init: RequestInit): Promise<string | null> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } }).catch(() => null);
  if (res?.ok) return null;
  const data = await res?.json().catch(() => ({}));
  return data?.error ?? "처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

/** 로그인 전에 저장하려던 사주가 있으면 로그인 직후 저장한다. */
export function SavePendingProfile() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(PENDING_PROFILE_KEY);
      window.localStorage.removeItem(PENDING_PROFILE_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    call("/api/me/profiles", { method: "POST", body: JSON.stringify({ input: JSON.parse(raw) }) }).then((err) => {
      if (err) setMsg(err);
      else window.location.reload();
    });
  }, []);
  return msg ? (
    <p className="error" role="alert">
      {msg}
    </p>
  ) : null;
}

/** 저장한 사주 한 줄의 단추: 내 사주로 정하기, 지우기(두 번 눌러 확인) */
export function ProfileButtons({ id, self }: { id: string; self: boolean }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const act = async (url: string, init: RequestInit) => {
    const err = await call(url, init);
    if (err) setError(err);
    else window.location.reload();
  };
  return (
    <div className="my-row-actions">
      <a className="btn-secondary" href={`/my/p/${id}`}>
        보기
      </a>
      {!self && (
        <button type="button" className="btn-link" onClick={() => act("/api/me/profiles", { method: "PATCH", body: JSON.stringify({ id }) })}>
          내 사주로
        </button>
      )}
      <button
        type="button"
        className="btn-link danger"
        onClick={() => (armed ? act(`/api/me/profiles?id=${encodeURIComponent(id)}`, { method: "DELETE" }) : setArmed(true))}
      >
        {armed ? "한 번 더 누르면 지웁니다" : "지우기"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** 예전에 산 감정서를 보관함에 넣기 */
export function ClaimOrderForm() {
  const [orderId, setOrderId] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await call("/api/me/orders", { method: "POST", body: JSON.stringify({ orderId, contact }) });
    setBusy(false);
    if (err) setError(err);
    else window.location.reload();
  }
  return (
    <form className="my-claim" onSubmit={submit}>
      <p className="muted">비회원으로 산 감정서도 주문번호와 주문할 때 적은 연락처로 보관함에 넣을 수 있습니다. 보관함에 넣으면 열람 기간 없이 계속 열 수 있습니다.</p>
      <div className="field">
        <label htmlFor="claim-order">주문번호</label>
        <input id="claim-order" type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="CGR-20261017-…" autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="claim-contact">이메일 또는 휴대폰 번호</label>
        <input id="claim-contact" type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="name@example.com 또는 010-1234-5678" />
      </div>
      <button type="submit" className="btn-secondary" disabled={busy || !orderId.trim() || !contact.trim()}>
        {busy ? "확인 중…" : "보관함에 넣기"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

/** 로그아웃과 회원 탈퇴(두 번 눌러 확인. 앱(WebView)에서는 confirm 창이 뜨지 않는다) */
export function AccountButtons() {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <div className="my-account">
      <button
        type="button"
        className="btn-secondary"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
          window.location.replace("/my");
        }}
      >
        로그아웃
      </button>
      <button
        type="button"
        className="btn-link danger"
        onClick={async () => {
          if (!armed) return setArmed(true);
          const err = await call("/api/me", { method: "DELETE" });
          if (err) setError(err);
          else window.location.replace("/my?bye=1");
        }}
      >
        {armed ? "한 번 더 누르면 탈퇴합니다(저장한 사주가 모두 지워집니다)" : "회원 탈퇴"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
