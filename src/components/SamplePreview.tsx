"use client";

import { useEffect, useState } from "react";
import { PRODUCT_ORDER, PRODUCTS, type ProductId } from "@/lib/product";

/**
 * 감정서 견본 미리 보기. 가상의 의뢰인으로 실제 감정서와 같은 방식으로 만든 PDF(public/samples)를 보여 준다.
 * 견본 다시 만들기: data/samples/README.md
 */
const SAMPLES: Partial<Record<ProductId, { file: string; pages: number; thumbs: { src: string; label: string }[]; real: string; who: string }>> = {
  full: {
    file: "/samples/full-sample.pdf",
    pages: 15,
    real: "실제 감정서는 풀이 분량에 따라 보통 18~22쪽입니다.",
    who: "가상의 의뢰인 ‘홍길동’(1990년 5월 15일생 남성)",
    thumbs: [
      { src: "/samples/full-sample-p1.jpg", label: "표지" },
      { src: "/samples/full-sample-p2.jpg", label: "사주 유형" },
      { src: "/samples/full-sample-p5.jpg", label: "1부 명식·풀이" },
      { src: "/samples/full-sample-p12.jpg", label: "5부 월별 흐름" },
    ],
  },
  core: {
    file: "/samples/core-sample.pdf",
    pages: 11,
    real: "실제 감정서는 풀이 분량에 따라 보통 12~15쪽입니다.",
    who: "가상의 의뢰인 ‘홍길동’(1990년 5월 15일생 남성)",
    thumbs: [
      { src: "/samples/core-sample-p1.jpg", label: "표지" },
      { src: "/samples/core-sample-p2.jpg", label: "사주 유형" },
      { src: "/samples/core-sample-p5.jpg", label: "1부 명식·풀이" },
    ],
  },
  naming: {
    file: "/samples/naming-sample.pdf",
    pages: 11,
    real: "실제 작명록은 이름 풀이 분량에 따라 보통 11~15쪽입니다.",
    who: "가상의 의뢰 ‘김○○’(2026년 9월 3일생 여아, 느낌: 지혜로운·따뜻한)",
    thumbs: [
      { src: "/samples/naming-sample-p1.jpg", label: "표지" },
      { src: "/samples/naming-sample-p4.jpg", label: "추천 이름" },
      { src: "/samples/naming-sample-p5.jpg", label: "이름별 풀이" },
    ],
  },
};

/**
 * 천기록 Android 앱(WebView)은 PDF를 화면에 띄우지 못하고, PDF 링크를 누르면 내려받기로 넘겨 아무 반응이 없다.
 * 앱 안에서는 intent:// 주소로 바꿔 휴대폰 브라우저(또는 PDF 앱)에서 열게 한다. 앱은 intent 주소를 이미 바깥 앱으로 넘긴다.
 */
function appPdfHref(path: string): string {
  const url = new URL(path, location.href);
  const fallback = encodeURIComponent(url.href);
  return `intent://${url.host}${url.pathname}#Intent;scheme=${url.protocol.replace(":", "")};action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end`;
}

const SHORT: Partial<Record<ProductId, string>> = { core: "핵심 명식록", full: "종합 감정서", naming: "작명록" };

/**
 * productId를 주면 그 상품의 견본만(결제 칸에서 고른 상품), 주지 않으면 상품을 바꿔 볼 수 있는 단추와 함께 보여 준다
 * (결제가 열리지 않았을 때·첫 화면 상품 안내).
 */
export default function SamplePreview({ productId }: { productId?: ProductId }) {
  const ids = PRODUCT_ORDER.filter((id) => PRODUCTS[id].available && SAMPLES[id]);
  const [picked, setPicked] = useState<ProductId>(ids.includes("full") ? "full" : ids[0]);
  const id = productId ?? picked;
  const s = SAMPLES[id];
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    setInApp(Boolean(window.AndroidBridge));
  }, []);
  if (!s) return null;
  const href = inApp ? appPdfHref(s.file) : s.file;
  return (
    <section className="sample-preview" aria-labelledby={`sample-h-${id}`}>
      <h3 id={`sample-h-${id}`}>{PRODUCTS[id].name} 견본 미리 보기</h3>
      {!productId && ids.length > 1 && (
        <div className="segmented" role="group" aria-label="견본 고르기">
          {ids.map((x) => (
            <button key={x} type="button" aria-pressed={x === id} onClick={() => setPicked(x)}>
              {SHORT[x]}
            </button>
          ))}
        </div>
      )}
      <p className="muted">
        {s.who}으로 만든 견본입니다. 결제하시면 이와 같은 A4 책자 모양의 감정서를 받아 PDF로 저장하실 수 있습니다. 견본은 {s.pages}쪽이며,{" "}
        {s.real}
      </p>
      <div className="sample-thumbs">
        {s.thumbs.map((t) => (
          <a key={t.src} href={href} target="_blank" rel="noopener">
            <img src={t.src} alt={`견본 ${t.label}`} loading="lazy" width={300} height={424} />
            <span>{t.label}</span>
          </a>
        ))}
      </div>
      <a className="btn-secondary link-btn" href={href} target="_blank" rel="noopener">
        견본 PDF 전체 보기 ({s.pages}쪽)
      </a>
    </section>
  );
}
