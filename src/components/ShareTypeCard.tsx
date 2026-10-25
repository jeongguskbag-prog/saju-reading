"use client";

import { useEffect, useState } from "react";
import { externalOpenUrl, inAppBrowser } from "@/lib/inapp";
import type { SajuChart } from "@/lib/saju/calc";
import { gradeTiers } from "@/lib/saju/grade";
import { BRANCH_ANIMAL, ELEMENT_KO, type Branch } from "@/lib/saju/constants";
import { markOf } from "@/lib/saju/analysis";
import ShareEventNote from "./ShareEventNote";

const W = 1080;
const H = 1920;
const NAVY = "#1f2a44";
const PAPER = "#f6f1e7";
const RED = "#b0262c";
const GOLD = "#d9b77a";
const SERIF = '"Song Myung", "Nanum Myeongjo", "Noto Serif KR", serif';
const SANS = '"Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';

/** 글을 너비에 맞춰 여러 줄로 나눈다(한글은 글자 단위로 끊는다). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > width && line) {
      lines.push(line.trim());
      line = ch;
    } else line += ch;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/** 사주 유형 공유 카드(인스타 스토리 9:16)를 그린다. 이름은 넣지 않는다. */
/** 카드에 더 넣을 것(감정서 화면): 키워드와 올해 흐름 */
export interface CardExtra {
  keywords?: string[];
  withYear?: boolean;
}

/** 올해 세운의 용신 부합도로 본 한 줄: "2026 丙午년 · 좋음" */
export function thisYearLine(chart: SajuChart): string | null {
  const y = chart.analysis.yearScores?.[0];
  return y ? `${y.year} ${y.ganzhi}년 · ${markOf(y.score)}` : null;
}

async function drawCard(chart: SajuChart, type: "image/png" | "image/jpeg" = "image/png", extra: CardExtra = {}): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const g = chart.grade;
  const tier = gradeTiers("ko").find((x) => x.level === g.tier.level) ?? g.tier;

  // 바탕과 테두리
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(64, 64, W - 128, H - 128);

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = `64px ${SERIF}`;
  ctx.fillText("天 機 錄", W / 2, 210);
  ctx.font = `34px ${SANS}`;
  ctx.fillStyle = "#c9c3b5";
  ctx.fillText("나의 사주 유형", W / 2, 290);

  // 붉은 도장
  const s = 300;
  const x = (W - s) / 2;
  const y = 360;
  ctx.fillStyle = RED;
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 6;
  ctx.strokeRect(x + 18, y + 18, s - 36, s - 36);
  ctx.fillStyle = PAPER;
  ctx.font = `120px ${SERIF}`;
  const seal = [...tier.seal];
  ctx.fillText(seal[0] ?? "", W / 2, y + 140);
  ctx.fillText(seal[1] ?? "", W / 2, y + 262);

  // 유형 이름
  ctx.fillStyle = "#ffffff";
  ctx.font = `76px ${SERIF}`;
  ctx.fillText(tier.type.replace(/\(.*\)$/, ""), W / 2, 800);
  ctx.fillStyle = GOLD;
  ctx.font = `40px ${SERIF}`;
  ctx.fillText(tier.type.match(/\((.*)\)/)?.[1] ?? "", W / 2, 865);
  ctx.fillStyle = "#ffffff";
  ctx.font = `46px ${SANS}`;
  ctx.fillText(tier.name, W / 2, 960);

  const keywords = (extra.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 3);
  if (keywords.length) {
    // 키워드 칩: 가운데 정렬로 한 줄(넘치면 두 줄)
    ctx.font = `bold 38px ${SANS}`;
    const pad = 34;
    const widths = keywords.map((k) => ctx.measureText(`#${k}`).width + pad * 2);
    const rows: number[][] = [[]];
    let rowW = 0;
    widths.forEach((w, i) => {
      if (rowW + w > W - 200 && rows[rows.length - 1].length) {
        rows.push([]);
        rowW = 0;
      }
      rows[rows.length - 1].push(i);
      rowW += w + 20;
    });
    rows.forEach((row, r) => {
      const total = row.reduce((a, i) => a + widths[i], 0) + (row.length - 1) * 20;
      let x = (W - total) / 2;
      const yTop = 1010 + r * 96;
      row.forEach((i) => {
        ctx.fillStyle = "rgba(217,183,122,0.18)";
        ctx.fillRect(x, yTop, widths[i], 72);
        ctx.fillStyle = GOLD;
        ctx.textAlign = "center";
        ctx.fillText(`#${keywords[i]}`, x + widths[i] / 2, yTop + 50);
        x += widths[i] + 20;
      });
    });
    ctx.textAlign = "center";
  } else {
    ctx.fillStyle = "#d8d3c6";
    ctx.font = `36px ${SANS}`;
    wrap(ctx, tier.desc, W - 260).forEach((l, i) => ctx.fillText(l, W / 2, 1050 + i * 56));
  }

  // 숫자 칸
  const branch = chart.pillars.year.branch as Branch;
  const facts: [string, string][] = [
    [g.topPercent <= 50 ? "전체 사주 중" : "이 유형의 비율", g.topPercent <= 50 ? `상위 ${g.topPercent}%` : `${tier.share}%`],
    ["같은 조합", `${(g.rarity.oneIn >= 1000 ? Math.round(g.rarity.oneIn / 100) * 100 : g.rarity.oneIn).toLocaleString("ko-KR")}명 중 1명`],
    ["일간 · 띠", `${chart.dayMaster.stem} ${ELEMENT_KO[chart.dayMaster.element]} · ${BRANCH_ANIMAL[branch]}띠`],
  ];
  const year = extra.withYear ? thisYearLine(chart) : null;
  if (year) facts.push(["올해 흐름", year]);
  const boxY = year ? 1150 : 1250;
  facts.forEach(([k, v], i) => {
    const by = boxY + i * 130;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(150, by, W - 300, 108);
    ctx.textAlign = "left";
    ctx.fillStyle = "#bdb7a8";
    ctx.font = `32px ${SANS}`;
    ctx.fillText(k, 190, by + 66);
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 40px ${SANS}`;
    ctx.fillText(v, W - 190, by + 68);
  });

  // 아래 안내
  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = `38px ${SERIF}`;
  ctx.fillText("내 사주 유형 무료로 보기", W / 2, 1740);
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 44px ${SANS}`;
  ctx.fillText("chungirok.com", W / 2, 1806);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들지 못했습니다."))), type, 0.92));
}

/**
 * 이미지 저장: 화면에서 만든 이미지를 서버에 10분 맡기고, 그 파일 주소를 열어 휴대폰의 내려받기로 저장한다.
 * 브라우저마다(삼성 인터넷·크롬·앱 안 브라우저) 화면 속 이미지 저장 방식이 달라, 같은 방법(파일 내려받기)으로 맞춘다.
 * 천기록 앱(WebView)과 카카오톡 등 앱 안 브라우저는 휴대폰 기본 브라우저로 넘겨 내려받는다.
 */
async function saveViaServer(blob: Blob): Promise<boolean> {
  const res = await fetch("/api/type-card", { method: "POST", headers: { "Content-Type": blob.type }, body: blob }).catch(() => null);
  const data = ((await res?.json().catch(() => null)) ?? {}) as { path?: string };
  if (!res?.ok || !data.path) return false;
  const u = new URL(data.path, location.origin);
  const kind = inAppBrowser(navigator.userAgent);
  if (window.AndroidBridge || kind === "android") {
    location.href = `intent://${u.host}${u.pathname}#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
  } else if (kind === "kakao" || kind === "ios") {
    location.href = externalOpenUrl(kind, u.href) ?? u.href;
  } else {
    // 일반 브라우저: 파일 주소를 열면 화면은 그대로 두고 내려받는다.
    location.href = u.href;
  }
  return true;
}

/** 무료 결과의 사주 유형을 인스타 스토리·카톡용 이미지로 저장·공유 */
export default function ShareTypeCard({ chart, extra, embedded = false }: { chart: SajuChart; extra?: CardExtra; embedded?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    const nav = navigator as unknown as { share?: unknown; canShare?: (d: ShareData) => boolean };
    const probe = new File([new Blob(["x"], { type: "image/png" })], "x.png", { type: "image/png" });
    setCanShare(!window.AndroidBridge && typeof nav.share === "function" && Boolean(nav.canShare?.({ files: [probe] })));
  }, []);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const jpg = await drawCard(chart, "image/jpeg", extra);
      setPreview(URL.createObjectURL(jpg));
      const ok = await saveViaServer(jpg);
      setMsg(
        ok
          ? "이미지를 내려받습니다. 내려받은 사진은 갤러리(또는 '내 파일 > 다운로드')에 있습니다."
          : "이미지를 내려받지 못했습니다. 아래 이미지를 화면 캡처해 주세요.",
      );
    } catch {
      setMsg("이미지를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    setMsg(null);
    try {
      const blob = await drawCard(chart, "image/png", extra);
      const file = new File([blob], "천기록_내사주유형.png", { type: "image/png" });
      await navigator.share({ files: [file], title: "나의 사주 유형", text: "내 사주 유형 무료로 보기 → https://www.chungirok.com" });
    } catch (error) {
      if ((error as Error).name !== "AbortError") setMsg("공유하지 못했습니다. '이미지 저장'으로 받은 뒤 올려 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const actions = (
    <>
      <div className="share-type-actions">
        <button type="button" className="btn-secondary" onClick={save} disabled={busy}>
          {busy ? "이미지 만드는 중…" : "이미지 저장"}
        </button>
        {canShare && (
          <button type="button" className="btn-secondary" onClick={share} disabled={busy}>
            인스타·카톡으로 공유
          </button>
        )}
      </div>
      {msg && <p className="muted">{msg}</p>}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="share-type-preview" src={preview} alt="나의 사주 유형 카드" />
      )}
      <ShareEventNote />
    </>
  );
  if (embedded) return <div className="share-type no-print">{actions}</div>;
  return (
    <section className="card share-type no-print" aria-labelledby="share-type-h">
      <h2 id="share-type-h">내 사주 유형 공유하기</h2>
      <p className="muted">인스타그램 스토리·카카오톡에 올리기 좋은 세로 이미지로 만들어 드립니다. 이름은 들어가지 않습니다.</p>
      {actions}
    </section>
  );
}
