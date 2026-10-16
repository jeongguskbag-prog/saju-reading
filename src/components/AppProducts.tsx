import { PRODUCT_ORDER, PRODUCTS, withProductYears, type ProductId } from "@/lib/product";

/**
 * 앱 전용 화면(한국어)의 감정서 고르기. 웹 랜딩의 상품 카드와 같은 모양이지만 결제 없이 무료로 받는다.
 * 고르면 아래 입력 칸으로 내려가고, 고른 감정서에 든 파트만 작성한다.
 */
export default function AppProducts({ value, onChange, years }: { value: ProductId; onChange: (id: ProductId) => void; years: [number, number] }) {
  return (
    <section className="app-products no-print" aria-label="감정서 고르기">
      <h2>받으실 감정서를 고르세요</h2>
      <div className="lp-products">
        {PRODUCT_ORDER.map((id) => {
          const p = PRODUCTS[id];
          // 작명록은 성씨·돌림자 등 따로 받는 신청서가 있어 웹(천기록 홈페이지)에서만 신청한다.
          const available = p.available && id !== "naming";
          const selected = available && value === id;
          return (
            <div key={id} className={`lp-plan${selected ? " paid" : ""}${available ? "" : " soon"}`}>
              {id === "full" && <span className="lp-pick">추천</span>}
              <h3>{p.name}</h3>
              {available && <p className="lp-price app-free">앱 무료</p>}
              <p className="lp-plan-sum">{withProductYears(p.summary, years)}</p>
              {available ? (
                <>
                  <p className="lp-plan-parts">
                    {p.parts.length - 1 === 5 ? "1~5부 전체" : "1부 천명 · 5부 세운과 개운법"} · 유형표·대운 곡선·월별 흐름표 · 책자형 PDF
                  </p>
                  <button
                    type="button"
                    className={selected ? "lp-cta" : "lp-cta-ghost"}
                    aria-pressed={selected}
                    onClick={() => {
                      onChange(id);
                      document.getElementById("saju-form")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {selected ? "✓ 선택됨 · 생년월일시 넣기" : "이 감정서로 받기"}
                  </button>
                </>
              ) : (
                <p className="lp-soon">{p.available ? "홈페이지에서 신청할 수 있습니다" : "준비 중입니다"}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
