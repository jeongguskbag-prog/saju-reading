import SiteShell from "@/components/SiteShell";

type Params = Promise<{ code?: string; message?: string; orderId?: string }>;

/** 토스 결제창에서 취소하거나 실패했을 때 돌아오는 곳. */
export default async function PayFail({ searchParams }: { searchParams: Params }) {
  const { code, message } = await searchParams;
  const canceled = code === "PAY_PROCESS_CANCELED" || code === "USER_CANCEL";
  return (
    <SiteShell>
      <section className="card pay-result">
        <h2>{canceled ? "결제를 취소했습니다" : "결제가 이뤄지지 않았습니다"}</h2>
        <p>{canceled ? "결제된 금액은 없습니다. 언제든 다시 시도할 수 있습니다." : message?.slice(0, 120) || "카드 정보나 한도를 확인한 뒤 다시 시도해 주세요."}</p>
        <a className="btn-primary link-btn" href="/#saju-form">다시 시도하기</a>
      </section>
    </SiteShell>
  );
}
