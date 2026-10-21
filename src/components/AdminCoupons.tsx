"use client";

import { useState } from "react";

export interface AdminCouponRow {
  code: string;
  label: string;
  products: string;
  expires: string;
  uses: number;
  maxUses?: number;
  note?: string;
  disabled?: boolean;
}

/** 관리 화면: 할인 쿠폰 만들기·목록·끄기 */
export default function AdminCoupons({ rows, products }: { rows: AdminCouponRow[]; products: { id: string; name: string }[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"percent" | "amountOff">("percent");

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = ((await res?.json().catch(() => null)) ?? {}) as { error?: string };
    setBusy(false);
    if (res?.ok) {
      setMsg({ ok: true, text: "저장했습니다. 새로고침하면 목록에 보입니다." });
      return true;
    }
    setMsg({ ok: false, text: data.error ?? "저장하지 못했습니다." });
    return false;
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const product = String(f.get("product") ?? "");
    const ok = await post({
      code: f.get("code"),
      [kind]: Number(f.get("value")),
      ...(product ? { productIds: [product] } : {}),
      expiresAt: f.get("expiresAt") || undefined,
      maxUses: Number(f.get("maxUses")) || undefined,
      note: f.get("note") || undefined,
    });
    if (ok) location.reload();
  }

  return (
    <section className="card admin-orders">
      <h2>할인 쿠폰</h2>
      <p className="muted">
        손님이 감정서 신청 화면의 &apos;할인 쿠폰 코드&apos;에 넣으면 결제 금액이 줄어듭니다. 주소 끝에 <code>?coupon=코드</code>를 붙여 보내면 코드가 미리
        채워집니다(예: chungirok.com/?coupon=WELCOME10). 결제 금액은 1,000원 아래로 내려가지 않습니다.
      </p>
      <form className="admin-coupon-form" onSubmit={create}>
        <label>
          코드
          <input name="code" type="text" required maxLength={24} placeholder="WELCOME10" />
        </label>
        <label>
          할인 방식
          <select value={kind} onChange={(e) => setKind(e.target.value as "percent" | "amountOff")}>
            <option value="percent">할인율(%)</option>
            <option value="amountOff">할인 금액(원)</option>
          </select>
        </label>
        <label>
          {kind === "percent" ? "할인율(%)" : "할인 금액(원)"}
          <input name="value" type="number" required min={1} />
        </label>
        <label>
          대상 상품
          <select name="product" defaultValue="">
            <option value="">모든 감정서</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          기한(이날까지)
          <input name="expiresAt" type="date" />
        </label>
        <label>
          사용 횟수(비우면 무제한)
          <input name="maxUses" type="number" min={1} />
        </label>
        <label>
          메모
          <input name="note" type="text" maxLength={60} placeholder="인스타 이벤트" />
        </label>
        <button className="btn-primary" type="submit" disabled={busy}>
          쿠폰 만들기
        </button>
      </form>
      {msg && <p className={msg.ok ? "coupon-ok" : "error"}>{msg.text}</p>}
      {rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th>코드</th>
                <th>할인</th>
                <th>대상</th>
                <th>기한</th>
                <th>사용</th>
                <th>메모</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td>
                    <b>{r.code}</b>
                  </td>
                  <td>{r.label}</td>
                  <td>{r.products}</td>
                  <td>{r.expires}</td>
                  <td>
                    {r.uses}
                    {r.maxUses ? ` / ${r.maxUses}` : ""}
                  </td>
                  <td>{r.note}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-link"
                      disabled={busy}
                      onClick={async () => {
                        if (await post({ code: r.code, disabled: !r.disabled })) location.reload();
                      }}
                    >
                      {r.disabled ? "꺼짐 · 켜기" : "사용 중 · 끄기"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
