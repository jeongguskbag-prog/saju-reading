"use client";

import { useState } from "react";

export default function AdminReviewToggle({ orderId, hidden }: { orderId: string; hidden: boolean }) {
  const [h, setH] = useState(hidden);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    const res = await fetch("/api/admin/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, hidden: !h }) });
    if (res.ok) setH(!h);
    setBusy(false);
  }
  return (
    <button type="button" className="btn-link" disabled={busy} onClick={toggle}>
      {h ? "숨김 → 다시 보이기" : "보임 → 숨기기"}
    </button>
  );
}
