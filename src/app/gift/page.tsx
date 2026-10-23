import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import { GiftBuyForm } from "@/components/GiftForms";
import { GIFT_PRODUCTS, isGiftProduct } from "@/lib/gift";
import { checkoutConfig } from "@/lib/orders";
import { BRAND, PRODUCTS, withProductYears } from "@/lib/product";
import { isAdminViewer } from "@/lib/checkout-access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `감정서 선물하기 — ${BRAND.name}`, description: "부모님·가족·친구에게 천기록 감정서를 선물하세요. 받는 분이 생년월일시를 넣으면 감정서가 만들어집니다." };

/** 감정서 선물하기: 사는 분이 상품과 받는 분을 고르고 결제하면 선물 링크가 생긴다. */
export default async function GiftPage() {
  const { enabled, testMode, sms, kakao } = checkoutConfig({ admin: await isAdminViewer() });
  const y = new Date(Date.now() + 9 * 3_600_000).getUTCFullYear();
  const products = GIFT_PRODUCTS.filter(isGiftProduct).map((id) => ({
    id,
    name: PRODUCTS[id].name,
    price: PRODUCTS[id].price,
    summary: withProductYears(PRODUCTS[id].summary, [y, y + 1]),
  }));
  const offered = ["email", ...(kakao ? ["kakao"] : []), ...(sms ? ["sms"] : [])] as ("email" | "kakao" | "sms")[];
  return (
    <SiteShell>
      <section className="card gift-hero">
        <p className="eyebrow">천기록 감정서 선물</p>
        <h1>마음을 담아, 한 사람만을 위한 감정서를 선물하세요</h1>
        <p>
          받는 분의 생년월일시를 몰라도 괜찮습니다. 결제하면 <b>선물 링크</b>가 만들어지고, 받는 분이 링크에서 직접 생년월일시를 넣으면 그 분의 명식으로
          감정서가 만들어집니다. 새해·생신·어버이날 선물로 좋습니다.
        </p>
        <ol className="gift-steps">
          <li>감정서를 고르고 보내는 분·받는 분 이름과 전할 말을 적어 결제합니다.</li>
          <li>결제가 끝나면 선물 링크를 카카오톡·문자로 받는 분께 전합니다.</li>
          <li>받는 분이 생년월일시를 넣으면 명식 미리보기가 바로 열리고, 감정서는 정해진 시간 뒤 받는 분께 보내 드립니다.</li>
        </ol>
      </section>
      <section className="card">
        {enabled && products.length ? (
          <GiftBuyForm products={products} offered={offered} testMode={testMode} />
        ) : (
          <p className="muted">선물하기 결제를 준비하고 있습니다.</p>
        )}
      </section>
    </SiteShell>
  );
}
