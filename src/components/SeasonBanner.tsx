import { newyearSeason } from "@/lib/season";
import { PRODUCTS, won } from "@/lib/product";

/** 신년 시즌(11월 중순~2월) 첫 화면 배너: 신년 운세록 */
export default function SeasonBanner() {
  const s = newyearSeason();
  if (!s) return null;
  return (
    <section className="season-banner" aria-labelledby="season-h">
      <div className="lp-inner season-inner">
        <p className="season-eyebrow">
          {s.year} {s.ganzhi}年 · {s.color} {s.animal}의 해
        </p>
        <h2 id="season-h">
          {s.year} {s.reading}년, 내 한 해의 흐름을 미리 봅니다
        </h2>
        <p>
          {s.year}년 세운이 내 명식과 만나는 자리, 열두 달의 좋음·보통·주의, 삼재 여부와 대운의 변화까지 계산해 엮은 <b>신년 운세록</b>(
          {won(PRODUCTS.newyear.price)}). 부모님·가족께 드리는 새해 선물로도 좋습니다.
        </p>
        <div className="season-actions">
          <a className="lp-cta" href="/?p=newyear#saju-form">
            {s.year} 신년 운세 보기
          </a>
          <a className="lp-cta-ghost on-cover" href="/gift">
            가족에게 선물하기
          </a>
        </div>
      </div>
    </section>
  );
}
