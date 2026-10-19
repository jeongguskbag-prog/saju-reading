import type { Metadata } from "next";
import { headers } from "next/headers";
import SiteShell from "@/components/SiteShell";
import { GiftRedeemForm, GiftShare } from "@/components/GiftForms";
import { getGift } from "@/lib/gift";
import { checkoutConfig, getOrder } from "@/lib/orders";
import { BRAND, PRODUCTS } from "@/lib/product";
import { originFrom } from "@/lib/site";

export const dynamic = "force-dynamic";
// 선물 링크는 검색에 노출하지 않는다.
export const metadata: Metadata = { title: `감정서 선물 — ${BRAND.name}`, robots: { index: false, follow: false } };

type Params = Promise<{ code: string }>;
type Search = Promise<{ new?: string }>;

export default async function GiftCodePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { code } = await params;
  const { new: fresh } = await searchParams;
  const gift = await getGift(code).catch(() => null);
  if (!gift?.gift) {
    return (
      <SiteShell>
        <section className="card pay-result">
          <h2>선물을 찾을 수 없습니다</h2>
          <p>링크를 다시 확인해 주세요. 결제가 취소된 선물이거나 주소가 잘못되었을 수 있습니다.</p>
          <a className="btn-secondary link-btn" href="/">처음으로</a>
        </section>
      </SiteShell>
    );
  }
  const g = gift.gift;
  const product = PRODUCTS[g.productId];
  const url = `${originFrom(await headers())}/gift/${code}`;
  const card = (
    <section className="card gift-card">
      <p className="eyebrow">天 機 錄 · 감정서 선물</p>
      <h1>
        {g.to} 님께, {g.from} 님이 보낸 선물
      </h1>
      <p className="gift-product">{product.name}</p>
      {g.message && <blockquote className="gift-message">{g.message}</blockquote>}
    </section>
  );

  // 사는 분: 결제 직후 선물 링크 전하기
  if (fresh === "1" && !g.redeemedOrderId) {
    return (
      <SiteShell>
        <section className="card">
          <p className="eyebrow">선물 결제가 완료되었습니다</p>
          <h2>아래 선물 링크를 {g.to} 님께 전해 주세요</h2>
          <p className="muted">
            받는 분이 링크를 열어 생년월일시를 넣으면 감정서가 만들어집니다. 링크를 아는 사람은 누구나 선물을 받을 수 있으니 받는 분께만 전해 주세요. 같은
            링크는 결제 확인 메일·문자로도 보내 드렸습니다.
          </p>
          <GiftShare url={url} to={g.to} />
          <p className="muted">주문번호 {gift.id}</p>
        </section>
        {card}
      </SiteShell>
    );
  }

  // 이미 받은 선물: 감정서로
  if (g.redeemedOrderId) {
    const done = await getOrder(g.redeemedOrderId);
    return (
      <SiteShell>
        {card}
        <section className="card">
          <h2>이미 받은 선물입니다</h2>
          <p>이 선물로 만든 감정서는 아래 버튼으로 열 수 있습니다.</p>
          {done?.token && (
            <a className="btn-primary link-btn" href={`/r/${done.token}`}>
              감정서 열기
            </a>
          )}
        </section>
      </SiteShell>
    );
  }

  // 받는 분: 생년월일시 넣고 받기
  const { sms, kakao } = checkoutConfig();
  const offered = ["email", ...(kakao ? ["kakao"] : []), ...(sms ? ["sms"] : [])] as ("email" | "kakao" | "sms")[];
  return (
    <SiteShell>
      {card}
      <section className="card">
        <h2>생년월일시를 넣고 선물을 받으세요</h2>
        <p className="muted">
          천기록 감정서는 생년월일시로 만세력을 세우고 명리 공식으로 계산한 값을 근거로 쓰는, 한 사람만을 위한 감정서입니다. 아래 정보를 넣으면 명식
          미리보기가 바로 열립니다.
        </p>
        <GiftRedeemForm code={code} toName={g.to} offered={offered} />
      </section>
    </SiteShell>
  );
}
