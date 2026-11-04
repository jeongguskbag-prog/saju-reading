import { PRODUCTS, won } from "@/lib/product";

/** 첫 화면 입구 상품 안내: 가장 부담 없는 주역 점으로 먼저 맛보기 */
export default function TasteBanner() {
  return (
    <section className="season-banner" aria-labelledby="taste-h">
      <div className="lp-inner season-inner">
        <p className="season-eyebrow">처음이라면</p>
        <h2 id="taste-h">{won(PRODUCTS.iching.price)}으로 먼저 맛보세요</h2>
        <p>
          지금 가장 궁금한 한 가지를 물으면, 시초점 방식으로 괘를 얻어 본괘·변효·지괘로 풀어 드리는 <b>주역 점</b>({won(PRODUCTS.iching.price)}).
          마음에 드시면 연애운 숏 감정서({won(PRODUCTS.love.price)}), 핵심 명식록({won(PRODUCTS.core.price)})으로 이어서 볼 수 있어요.
        </p>
        <div className="season-actions">
          <a className="lp-cta" href="/?p=iching#saju-form">
            주역 점 {won(PRODUCTS.iching.price)}으로 시작하기
          </a>
          <a className="lp-cta-ghost on-cover" href="#price">
            전체 감정서 보기
          </a>
        </div>
      </div>
    </section>
  );
}
