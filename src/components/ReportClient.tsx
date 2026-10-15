"use client";

import { useEffect, useRef, useState } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import { PART_KEYS, type PartKey, type PartResult } from "@/lib/report-shared";
import ReportView, { type PartStates } from "./ReportView";
import ResultActions from "./ResultActions";

interface Props {
  token: string;
  chart: SajuChart;
  initialParts: Partial<Record<PartKey, PartResult>>;
  justPaid: boolean;
  email: string;
  mailEnabled: boolean;
  orderId: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 저장된 파트는 바로 보여 주고, 없는 파트만 서버에 써 달라고 한다(다른 창에서 쓰는 중이면 기다린다). */
async function fetchPart(token: string, part: PartKey): Promise<PartResult> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const res = await fetch("/api/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, part }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 202) {
      await sleep(5000);
      continue;
    }
    if (!res.ok) throw new Error(data.error ?? "풀이를 불러오지 못했습니다.");
    return data as PartResult;
  }
  throw new Error("풀이 작성이 오래 걸리고 있습니다. 잠시 뒤 새로고침해 주세요.");
}

export default function ReportClient({ token, chart, initialParts, justPaid, email, mailEnabled, orderId }: Props) {
  const [parts, setParts] = useState<PartStates>(() =>
    Object.fromEntries(Object.entries(initialParts).map(([k, result]) => [k, { status: "done", result }])),
  );
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  function load(part: PartKey) {
    setParts((prev) => ({ ...prev, [part]: { status: "loading" } }));
    fetchPart(token, part)
      .then((result) => setParts((prev) => ({ ...prev, [part]: { status: "done", result } })))
      .catch((err: Error) => setParts((prev) => ({ ...prev, [part]: { status: "error", message: err.message } })));
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    PART_KEYS.filter((p) => !initialParts[p]).forEach(load);
    // 결제 직후 주소의 ?new=1은 지워 두어, 링크를 복사해도 깔끔하게 한다.
    if (justPaid) history.replaceState(null, "", location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = Object.values(parts).some((p) => p?.status === "loading");
  const doneCount = PART_KEYS.filter((p) => parts[p]?.status === "done").length;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/r/${token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const notice = (
    <section className="card report-notice no-print" aria-live="polite">
      {justPaid && <h2>결제가 끝났습니다</h2>}
      <p>
        {busy
          ? `풀이를 쓰고 있습니다(${doneCount}/${PART_KEYS.length}). 1~2분 걸리며, 이 창을 닫아도 작성은 이어집니다.`
          : "모든 풀이가 준비됐습니다."}
      </p>
      <p className="muted">
        {mailEnabled ? `${email}로 이 리포트 링크를 보냈습니다. ` : "이 페이지 주소가 리포트 열쇠입니다. 아래 버튼으로 복사해 두세요. "}
        링크를 아는 사람은 누구나 볼 수 있으니 공유에 주의해 주세요. 주문번호 {orderId}
      </p>
      <button type="button" className="btn-secondary" onClick={copyLink}>
        {copied ? "링크를 복사했습니다" : "리포트 링크 복사"}
      </button>
    </section>
  );

  return (
    <div id="result">
      <ReportView chart={chart} aiEnabled parts={parts} onRetry={load} afterGrade={notice} />
      <ResultActions chart={chart} busy={busy} />
    </div>
  );
}
