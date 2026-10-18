"use client";

import { useEffect } from "react";

/** 화면이 멈추는 오류를 보여 주고 서버에 기록한다(관리 화면 '화면 오류'에서 본다). */
export default function ErrorReport({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, path: location.pathname + location.search }),
    }).catch(() => {});
  }, [error]);
  return (
    <main className="container">
      <section className="card">
        <h2>화면에 문제가 생겼습니다</h2>
        <p className="muted">잠시 뒤 다시 시도해 주세요. 계속되면 아래 내용을 고객센터로 알려 주세요.</p>
        <p className="error">
          {error.message || "알 수 없는 오류"}
          {error.digest ? ` (${error.digest})` : ""}
        </p>
        <button type="button" className="btn-secondary" onClick={reset}>
          다시 시도
        </button>{" "}
        <a className="btn-link" href="/">
          홈으로
        </a>
      </section>
    </main>
  );
}
