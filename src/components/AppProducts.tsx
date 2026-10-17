"use client";

import { EXTRA_ORDER, PRODUCT_ORDER, PRODUCTS, withProductYears, type ProductId } from "@/lib/product";
// 앱은 운영자가 직접 쓰는 화면이라 결제는 없고, 웹과 같은 금액을 보여 주어 어떤 감정서인지 알아보기 쉽게 한다.
import { useT } from "./LocaleProvider";
import type { Messages } from "@/lib/messages";

/** 추가 상품이 무엇을 계산하는지(웹 "함께 보는 감정서"와 같은 설명). */
const EXTRA_HOW: Record<(typeof EXTRA_ORDER)[number], string> = {
  gunghap:
    "두 분의 생년월일시로 각각 명식을 세우고, 일간·배우자 자리·띠의 합충과 오행 보완, 대운 동행을 함께 봅니다. 상대 정보를 아래에 넣어 주세요.",
  newyear: "고르신 해의 간지를 내 명식과 대운에 겹쳐 보고, 삼재 여부와 열두 달 월운으로 달마다 할 일을 정리합니다.",
  taekil: "정한 기간의 날마다 간지를 세워, 사주와의 합충과 전통 길흉일을 함께 따져 좋은 날을 고릅니다.",
  iching: "물음 하나를 받아 시초점의 확률로 여섯 효를 얻고, 본괘·변효·지괘의 괘사와 효사로 풀어 드립니다.",
  ziwei: "음력 생년월일시로 열두 궁에 별을 배치한 명반을 세우고, 궁마다 풀어 드립니다. 태어난 시각이 필요합니다.",
};

/** 화면 언어의 상품 이름·소개(한국어는 product.ts). */
export const productCopy = (t: Messages, id: ProductId) =>
  (t.productNames as Partial<Record<ProductId, { name: string; summary: string }>> | null)?.[id] ?? {
    name: PRODUCTS[id].name,
    summary: PRODUCTS[id].summary,
  };

/**
 * 앱 전용 화면(한국어)의 감정서 고르기. 웹 랜딩의 상품 카드와 같은 모양이지만 결제 없이 무료로 받는다.
 * 고르면 아래 입력 칸으로 내려가고, 고른 감정서에 든 파트만 작성한다.
 */
export default function AppProducts({
  value,
  onChange,
  years,
}: {
  value: ProductId;
  onChange: (id: ProductId) => void;
  years: [number, number];
}) {
  const t = useT();
  const card = (id: ProductId) => {
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
              {id === "naming"
                ? t.productPartsNaming
                : id === "core" || id === "full"
                  ? `${p.parts.length - 1 === 5 ? t.productPartsFull : t.productPartsCore} · ${t.productExtras}`
                  : EXTRA_HOW[id as (typeof EXTRA_ORDER)[number]]}
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
  };
  return (
    <section className="app-products no-print" aria-label={t.productsAria}>
      <h2>{t.productsTitle}</h2>
      <div className="lp-products">{PRODUCT_ORDER.map(card)}</div>
      {/* 궁합·신년 운세·택일·주역 점·자미두수: 웹의 "함께 보는 감정서". 한국어 문장으로만 만들 수 있어 한국어 화면에만 둔다. */}
      {t.htmlLang === "ko" && (
        <>
          <h3 className="app-products-sub">함께 보는 감정서</h3>
          <div className="lp-products">{EXTRA_ORDER.map(card)}</div>
        </>
      )}
    </section>
  );
}
