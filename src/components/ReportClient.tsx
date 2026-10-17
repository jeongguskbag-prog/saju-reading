"use client";

import { useEffect, useRef, useState } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import type { ChapterKey, ReportPartKey as PartKey, PartResult } from "@/lib/report-shared";
import ReportView, { type PartStates } from "./ReportView";
import NamingReport from "./NamingReport";
import ExtraReport from "./extras/ExtraReport";
import { isExtraKind } from "@/lib/extras/kinds";
import { josa } from "@/lib/josa";
import { buildResultHtml } from "@/lib/export";
import ReviewForm, { type MyReview } from "./ReviewForm";

interface Props {
  token: string;
  /** 상품에 담긴 파트 */
  partKeys: PartKey[];
  productName: string;
  /** 열람 마감(ISO) */
  expiresAt: string;
  chart: SajuChart;
  initialParts: Partial<Record<PartKey, PartResult>>;
  justPaid: boolean;
  /** 완성 링크를 보낼 곳(이메일, 가린 휴대폰 번호). 보낼 수 없으면 null */
  sendTo: string | null;
  orderId: string;
  /** 파일을 보낼 시각(ISO). 발송을 예약하지 않았으면 null(완성 즉시 발송) */
  deliverAt: string | null;
  /** 화면에 감정서를 펼치기까지 남은 시간(ms). 결제 뒤 몇 분(기본 3분)을 기다린다. 0이면 바로 보여 준다. */
  revealInMs: number;
  /** 이 주문으로 남긴 후기(없으면 null) */
  initialReview: MyReview | null;
}

/** 서버가 만든 감정서 파일(PDF·HTML)을 내려받는 버튼. 만드는 데 몇 초 걸려 그동안 버튼에 표시한다. */
function FileButtons({ token, ready, productName, personName }: { token: string; ready: boolean; productName: string; personName: string }) {
  const fileBase = `천기록_${personName.replace(/[\\/:*?"<>|\s]+/g, "") || "감정서"}_${productName.replace(/^천기록 /, "").replace(/\s+/g, "")}`;
  const [making, setMaking] = useState<"pdf" | "html" | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** 받은 내용을 파일로 내려받게 한다 */
  function download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function save(ext: "pdf" | "html") {
    setError(null);
    // HTML 문서는 지금 화면을 그대로 담아 브라우저에서 바로 만든다(서버를 거치지 않아 빠르고 실패하지 않는다).
    if (ext === "html") {
      const result = document.getElementById("result");
      if (!result) return;
      download(new Blob([buildResultHtml(result, productName, "ko")], { type: "text/html;charset=utf-8" }), `${fileBase}.html`);
      fetch(`/r/${token}/saved`, { method: "POST" }).catch(() => {});
      return;
    }
    setMaking(ext);
    try {
      const res = await fetch(`/r/${token}/pdf`);
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || "파일을 만들지 못했습니다.");
      download(await res.blob(), `${fileBase}.pdf`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setMaking(null);
    }
  }
  return (
    <div className="file-buttons no-print">
      <div className="action-buttons">
        <button type="button" className="btn-primary" disabled={!ready || making !== null} onClick={() => save("pdf")}>
          {making === "pdf" ? "PDF 파일을 만드는 중…" : "PDF 파일 저장"}
        </button>
        <button type="button" className="btn-secondary" disabled={!ready || making !== null} onClick={() => save("html")}>
          {making === "html" ? "HTML 문서를 만드는 중…" : "HTML 문서 저장"}
        </button>
      </div>
      <p className="muted">
        {ready
          ? "PDF는 책자 모양 그대로 인쇄·보관용, HTML 문서는 인터넷 없이도 브라우저로 여는 보관용입니다. 파일을 만드는 데 10초쯤 걸릴 수 있습니다."
          : "감정서를 다 쓰면 저장 버튼이 켜집니다."}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button type="button" className="btn-link" onClick={() => window.print()}>
            브라우저 인쇄로 PDF 저장
          </button>
        </p>
      )}
    </div>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 저장된 파트는 바로 보여 주고, 없는 파트만 서버에 써 달라고 한다.
 * - 다른 창에서 같은 파트를 쓰는 중이면(202) 잠시 뒤 다시 묻는다.
 * - 휴대폰에서 다른 앱으로 넘어가거나 화면이 꺼져 연결이 끊기면(네트워크 오류) 서버는 계속 쓰고 있으므로,
 *   잠시 뒤 다시 연결해 저장된 결과를 받아 온다. 사용자가 버튼을 누를 필요가 없다.
 */
async function fetchPart(token: string, part: PartKey): Promise<PartResult> {
  let networkFailures = 0;
  for (let attempt = 0; attempt < 80; attempt++) {
    let res: Response;
    try {
      res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, part }),
      });
    } catch {
      // 연결 끊김. 화면이 다시 보일 때까지 기다렸다가 점점 간격을 늘려 다시 시도한다.
      networkFailures++;
      if (networkFailures > 20) throw new Error("인터넷 연결을 확인한 뒤 '이 파트 다시 작성'을 눌러 주세요.");
      await whenVisible();
      await sleep(Math.min(2000 * networkFailures, 10_000));
      continue;
    }
    networkFailures = 0;
    const data = await res.json().catch(() => ({}));
    if (res.status === 202) {
      await sleep(5000);
      continue;
    }
    // 504 등 서버 시간 초과: 서버가 이어서 저장했을 수 있으니 잠시 뒤 다시 묻는다.
    if (res.status === 504 || (res.status === 502 && !data.error)) {
      await sleep(5000);
      continue;
    }
    if (!res.ok) throw new Error(data.error ?? "풀이를 불러오지 못했습니다.");
    return data as PartResult;
  }
  throw new Error("풀이 작성이 오래 걸리고 있습니다. 잠시 뒤 새로고침해 주세요.");
}

/** 탭이 백그라운드면 다시 보일 때까지 기다린다(백그라운드에서는 요청이 끊기기 쉽다). */
function whenVisible(): Promise<void> {
  if (typeof document === "undefined" || document.visibilityState === "visible") return Promise.resolve();
  return new Promise((resolve) => {
    const on = () => {
      if (document.visibilityState === "visible") {
        document.removeEventListener("visibilitychange", on);
        resolve();
      }
    };
    document.addEventListener("visibilitychange", on);
  });
}

export default function ReportClient({ token, partKeys, productName, expiresAt, chart, initialParts, justPaid, sendTo, orderId, deliverAt, revealInMs, initialReview }: Props) {
  const [parts, setParts] = useState<PartStates>(() =>
    Object.fromEntries(Object.entries(initialParts).map(([k, result]) => [k, { status: "done", result }])),
  );
  const [copied, setCopied] = useState(false);
  // 결제 직후 몇 분은 작성 중 화면을 보여 주고, 그 뒤에 감정서를 펼친다(작성은 그동안에도 계속된다).
  const [waitMs, setWaitMs] = useState(revealInMs);
  useEffect(() => {
    if (revealInMs <= 0) return;
    const openAt = Date.now() + revealInMs;
    const timer = setInterval(() => {
      const left = Math.max(0, openAt - Date.now());
      setWaitMs(left);
      if (!left) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [revealInMs]);
  const waiting = waitMs > 0;
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
    partKeys.filter((p) => !initialParts[p]).forEach(load);
    // 결제 직후 주소의 ?new=1은 지워 두어, 링크를 복사해도 깔끔하게 한다.
    if (justPaid) history.replaceState(null, "", location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 화면으로 돌아왔을 때 오류로 멈춘 파트가 있으면 자동으로 다시 시도한다.
  const partsRef = useRef(parts);
  partsRef.current = parts;
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      partKeys.filter((p) => partsRef.current[p]?.status === "error").forEach(load);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = Object.values(parts).some((p) => p?.status === "loading");
  const doneCount = partKeys.filter((p) => parts[p]?.status === "done").length;

  // 서버가 감정서를 파일로 만들 때(헤드리스 크롬) 쓰는 함수: 다 쓰인 뒤에만 연다.
  useEffect(() => {
    if (waiting || doneCount !== partKeys.length) return;
    const w = window as unknown as { __reportHtml?: () => string };
    w.__reportHtml = () => buildResultHtml(document.getElementById("result")!, productName, "ko");
    return () => {
      delete w.__reportHtml;
    };
  }, [waiting, doneCount, partKeys.length, productName]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/r/${token}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const until = new Date(new Date(expiresAt).getTime() + 9 * 3_600_000);
  const untilText = `${until.getUTCFullYear()}년 ${until.getUTCMonth() + 1}월 ${until.getUTCDate()}일`;
  const sendAt = deliverAt ? new Date(new Date(deliverAt).getTime() + 9 * 3_600_000) : null;
  const sendAtText = sendAt
    ? `${sendAt.getUTCMonth() + 1}월 ${sendAt.getUTCDate()}일 ${sendAt.getUTCHours() < 12 ? "오전" : "오후"} ${sendAt.getUTCHours() % 12 || 12}시${sendAt.getUTCMinutes() ? ` ${sendAt.getUTCMinutes()}분` : ""}`
    : "";
  const lookupNote = "감정서 주소를 잃어버리셔도 사이트 아래 '주문 조회'에서 주문번호와 연락처로 다시 찾을 수 있습니다. ";
  const delivery = sendTo
    ? sendAt && sendAt.getTime() - 9 * 3_600_000 > Date.now()
      ? `${sendAtText}에 ${sendTo}(으)로 감정서 PDF 파일과 HTML 문서를 보내 드립니다. ${lookupNote}`
      : `${lookupNote}`
    : `이 페이지 주소가 감정서 열쇠입니다. 파일을 저장하고, 주소도 복사해 두세요. ${lookupNote}`;
  const notice = (
    <section className="card report-notice no-print" aria-live="polite">
      {justPaid && <h2>신청이 접수되었습니다</h2>}
      <p>
        {busy
          ? `${josa(productName, "을", "를")} 쓰고 있습니다(${doneCount}/${partKeys.length}). 각 부의 풀이를 쓰고 책자로 엮고 있으니 잠시만 기다려 주세요. 이 창을 닫아도 작성은 이어집니다.`
          : `${josa(productName, "이", "가")} 완성되었습니다.`}
      </p>
      <p className="muted">
        {delivery}
        감정서는 {untilText}까지 열 수 있으니 기간 안에 PDF로 저장해 두세요. 링크를 아는 사람은 누구나 볼 수 있으니 공유에
        주의해 주세요. 주문번호 {orderId}
      </p>
      <FileButtons token={token} ready={!busy && doneCount === partKeys.length} productName={productName} personName={chart.input.name ?? ""} />
      <button type="button" className="btn-link" onClick={copyLink}>
        {copied ? "감정서 주소를 복사했습니다" : "감정서 주소 복사"}
      </button>
    </section>
  );

  if (waiting) {
    const sec = Math.ceil(waitMs / 1000);
    const written = doneCount === partKeys.length;
    const total = Math.max(revealInMs, 1);
    const percent = Math.min(99, Math.round(((total - waitMs) / total) * 100));
    // 실제 진행에 맞춘 단계: 풀이를 다 쓰면 책자 편집 단계로 넘어간다.
    const steps: { label: string; state: "done" | "now" | "next" }[] = [
      { label: "명식 계산", state: "done" },
      { label: `각 부의 풀이 작성 (${doneCount}/${partKeys.length})`, state: written ? "done" : "now" },
      { label: "책자 편집·마무리", state: written ? "now" : "next" },
      { label: "감정서 열기", state: "next" },
    ];
    return (
      <div id="result">
        <section className="card report-waiting no-print" aria-live="polite">
          {justPaid && <p className="eyebrow">신청이 접수되었습니다</p>}
          <h2>{josa(productName, "을", "를")} 작성하고 있습니다</h2>
          <p>
            명식 계산부터 각 부의 풀이 작성, 책자 편집까지 차례로 진행되어 <b>약 3분</b> 걸립니다. 잠시만 기다려 주세요.
          </p>
          <div className="report-waiting-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="report-waiting-time">
            남은 시간 {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
          </p>
          <ol className="report-steps">
            {steps.map((st) => (
              <li key={st.label} className={st.state}>
                <i aria-hidden>{st.state === "done" ? "✓" : st.state === "now" ? <span className="spinner" /> : "·"}</i>
                {st.label}
              </li>
            ))}
          </ol>
          <p className="muted">
            작업이 끝나면 이 화면에 감정서가 열리고, PDF 파일과 HTML 문서로 바로 저장하실 수 있습니다. {sendTo ? delivery : ""}
            이 창을 닫아도 작성은 이어지니, 아래 버튼으로 이 화면 주소를 복사해 두시면 나중에 다시 열어 보실 수 있습니다. 주문번호 {orderId}
          </p>
          <button type="button" className="btn-secondary" onClick={copyLink}>
            {copied ? "감정서 주소를 복사했습니다" : "감정서 주소 복사"}
          </button>
        </section>
      </div>
    );
  }

  const extraKind = partKeys.find(isExtraKind);
  return (
    <div id="result">
      {extraKind ? (
        <ExtraReport kind={extraKind} chart={chart} parts={parts} onRetry={() => load(extraKind)} notice={notice} title={productName} />
      ) : partKeys.includes("naming") ? (
        <NamingReport chart={chart} parts={parts} onRetry={() => load("naming")} notice={notice} title={productName} />
      ) : (
        <ReportView
          chart={chart}
          aiEnabled
          parts={parts}
          onRetry={load}
          afterGrade={notice}
          include={partKeys.filter((p): p is ChapterKey => p.startsWith("part"))}
          title={productName}
        />
      )}
      <section className="card report-files no-print">
        <h2>감정서 저장</h2>
        <FileButtons token={token} ready={!busy && doneCount === partKeys.length} productName={productName} personName={chart.input.name ?? ""} />
      </section>
      {!busy && doneCount === partKeys.length && <ReviewForm token={token} initial={initialReview} />}
    </div>
  );
}
