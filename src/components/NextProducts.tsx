import { PRODUCTS, sellableProducts, withProductYears, won, type ProductId } from "@/lib/product";

/** 이 감정서를 본 분께 함께 권하는 감정서 */
const NEXT: Record<ProductId, ProductId[]> = {
  core: ["full", "gunghap"],
  full: ["gunghap", "newyear"],
  naming: ["full", "newyear"],
  gunghap: ["full", "taekil"],
  newyear: ["full", "gunghap"],
  taekil: ["gunghap", "newyear"],
  iching: ["newyear", "full"],
  ziwei: ["full", "gunghap"],
};

/** 감정서 끝: 다음에 보면 좋은 감정서(판매 중인 것만). 누르면 첫 화면에서 그 상품을 골라 둔다. */
export default function NextProducts({ productId }: { productId: ProductId }) {
  const sellable = new Set(sellableProducts().map((p) => p.id));
  const picks = (NEXT[productId] ?? []).filter((id) => sellable.has(id)).map((id) => PRODUCTS[id]);
  if (!picks.length) return null;
  const now = new Date();
  const y = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear();
  return (
    <section className="card next-products no-print" aria-labelledby="next-products-h">
      <h2 id="next-products-h">함께 보면 좋은 감정서</h2>
      <ul>
        {picks.map((p) => (
          <li key={p.id}>
            <a href={`/?p=${p.id}#saju-form`}>
              <b>{p.name}</b>
              <span>{withProductYears(p.summary, [y, y + 1])}</span>
              <em>{won(p.price)}</em>
            </a>
          </li>
        ))}
      </ul>
      <p className="muted">같은 생년월일시를 다시 넣으면 그 감정서를 골라 둔 채로 신청 화면이 열립니다.</p>
    </section>
  );
}
