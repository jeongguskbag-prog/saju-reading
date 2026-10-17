"use client";

import { useState } from "react";
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
  if (!s) return null;
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
          <a key={t.src} href={s.file} target="_blank" rel="noopener">
            <img src={t.src} alt={`견본 ${t.label}`} loading="lazy" width={300} height={424} />
            <span>{t.label}</span>
          </a>
        ))}
      </div>
      <a className="btn-secondary link-btn" href={s.file} target="_blank" rel="noopener">
        견본 PDF 전체 보기 ({s.pages}쪽)
      </a>
    </section>
  );
}
