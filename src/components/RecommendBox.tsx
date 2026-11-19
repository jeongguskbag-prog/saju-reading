"use client";

import { useMemo } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import { recommendFor } from "@/lib/saju/recommend";
import { PRODUCTS, sellableProducts, won, type ProductId } from "@/lib/product";
import { trackClient } from "@/lib/track-client";

/** 무료 결과 아래: 내 명식에서 눈에 띄는 점을 근거로 감정서 1~2개를 추천하고, 누르면 아래 신청 칸에서 그 감정서를 골라 준다. */
export default function RecommendBox({ chart, onPick }: { chart: SajuChart; onPick: (id: ProductId) => void }) {
  const recs = useMemo(() => recommendFor(chart, new Date(), sellableProducts().map((p) => p.id)), [chart]);
  if (!recs.length) return null;
  return (
    <section className="card recommend no-print" aria-labelledby="recommend-h">
      <h3 id="recommend-h">내 사주에서 눈에 띄는 점</h3>
      <p className="muted small">위 명식을 계산한 결과에서 골랐습니다.</p>
      <ul>
        {recs.map((r) => (
          <li key={r.product}>
            <p className="recommend-title">{r.title}</p>
            <p className="recommend-reason">{r.reason}</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                trackClient("choose");
                onPick(r.product);
              }}
            >
              {PRODUCTS[r.product].name} · {won(PRODUCTS[r.product].price)} 고르기
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
