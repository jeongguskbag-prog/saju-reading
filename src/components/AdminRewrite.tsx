"use client";

import { useEffect, useState } from "react";

/** 공개 전 감정서의 풀이를 AI로 새로 쓴다(두 번 눌러 확인). 새로 쓰는 데 몇 분 걸린다. */
export default function AdminRewrite({ orderId, name }: { orderId: string; name?: string }) {
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(t);
  }, [armed]);
  async function go() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setMsg("요청 중…");
    const res = await fetch("/api/admin/rewrite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }) }).catch(() => null);
    const data = ((await res?.json().catch(() => null)) ?? {}) as { error?: string; parts?: string[] };
    setMsg(
      res?.ok
        ? `${name ? `${name} 님 ` : ""}감정서 ${data.parts?.length ?? ""}개 파트를 새로 쓰는 중입니다. 3~5분 뒤 미리 보기를 새로고침해 확인하세요. 새로 쓰기에 실패한 파트는 원래 글이 그대로 남습니다.`
        : (data.error ?? "요청하지 못했습니다."),
    );
  }
  return (
    <span>
      {" "}
      <button type="button" className="btn-link" onClick={go}>
        {armed ? "한 번 더 누르면 다시 쓰기" : "다시 쓰기"}
      </button>
      {msg && <small className="muted"> {msg}</small>}
    </span>
  );
}
