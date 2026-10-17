"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (res.ok) location.reload();
    else setError((await res.json().catch(() => ({}))).error ?? "로그인하지 못했습니다.");
  }
  return (
    <section className="card">
      <h2>관리 화면</h2>
      <form className="form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="admin-pw">비밀번호</label>
          <input id="admin-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary" type="submit">들어가기</button>
        {error && <p className="error" role="alert">{error}</p>}
      </form>
    </section>
  );
}
