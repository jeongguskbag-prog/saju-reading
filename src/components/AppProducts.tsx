"use client";

import { PRODUCT_ORDER, PRODUCTS, withProductYears, type ProductId } from "@/lib/product";
// 앱은 운영자가 직접 쓰는 화면이라 결제는 없고, 웹과 같은 금액을 보여 주어 어떤 감정서인지 알아보기 쉽게 한다.
import { useT } from "./LocaleProvider";
import type { Messages } from "@/lib/messages";

/** 화면 언어의 상품 이름·소개(한국어는 product.ts). */
export const productCopy = (t: Messages, id: ProductId) => t.productNames?.[id] ?? { name: PRODUCTS[id].name, summary: PRODUCTS[id].summary };

/**
 * 앱 전용 화면(한국어)의 감정서 고르기. 웹 랜딩의 상품 카드와 같은 모양이지만 결제 없이 무료로 받는다.
 * 고르면 아래 입력 칸으로 내려가고, 고른 감정서에 든 파트만 작성한다.
 */
export default function AppProducts({ value, onChange, years }: { value: ProductId; onChange: (id: ProductId) => void; years: [number, number] }) {
  const t = useT();
  return (
    <section className="app-products no-print" aria-label={t.productsAria}>
      <h2>{t.productsTitle}</h2>
      <div className="lp-products">
        {PRODUCT_ORDER.map((id) => {
          const p = PRODUCTS[id];
          const copy = productCopy(t, id);
          // 작명록은 한국 이름·인명용 한자를 쓰므로 한국어 화면에서만 만든다.
          const available = p.available && (id !== "naming" || t.htmlLang === "ko");
          const selected = available && value === id;
          return (
            <div key={id} className={`lp-plan${selected ? " paid" : ""}${available ? "" : " soon"}`}>
              {id === "full" && <span className="lp-pick">{t.productPick}</span>}
              <h3>{copy.name}</h3>
              {available && <p className="lp-price">{t.price(p.price)}</p>}
              <p className="lp-plan-sum">{withProductYears(copy.summary, years)}</p>
              {available ? (
                <>
                  <p className="lp-plan-parts">
                    {id === "naming" ? t.productPartsNaming : `${p.parts.length - 1 === 5 ? t.productPartsFull : t.productPartsCore} · ${t.productExtras}`}
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
                    {selected ? t.productChosen : t.productChoose}
                  </button>
                </>
              ) : (
                <p className="lp-soon">{p.available ? t.productWebOnly : t.productSoon}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
