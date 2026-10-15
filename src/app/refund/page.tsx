import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";
import { BRAND, BUSINESS, sellableProducts, won } from "@/lib/product";

export const metadata: Metadata = { title: `환불 규정 — ${BRAND.name}` };

export default function Refund() {
  const contact = [BUSINESS.phone, BUSINESS.email].filter(Boolean).join(" / ") || "등록 예정";
  return (
    <PolicyPage title="환불 규정">
      <h2>청약철회가 제한되는 이유</h2>
      <p>
        {sellableProducts()
          .map((p) => `“${p.name}”(${won(p.price)})`)
          .join(", ")}
        는 결제가 끝나는 즉시 입력하신 생년월일시로 풀이 작성이 시작되는 디지털
        콘텐츠입니다. 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제5호에 따라 작성이 시작된 뒤에는 청약철회가 제한되며, 이
        내용은 결제 전 구매 화면에서 안내하고 동의를 받습니다.
      </p>

      <h2>전액 환불해 드리는 경우</h2>
      <ul>
        <li>결제는 됐는데 감정서 링크가 발급되지 않거나, 감정서 완성 메일을 받지 못하고 링크도 확인할 수 없는 경우</li>
        <li>감정서의 풀이가 오류로 작성되지 않고, 화면의 &ldquo;이 파트 다시 작성&rdquo;을 눌러도 계속 작성되지 않는 경우</li>
        <li>같은 주문이 두 번 이상 결제된 경우(중복된 결제분)</li>
      </ul>

      <h2>그 밖의 경우</h2>
      <ul>
        <li>생년월일시·성별·양력/음력을 잘못 입력한 경우: 고객센터로 주문번호와 함께 문의해 주시면 확인 후 안내해 드립니다.</li>
        <li>풀이 내용이 기대와 다르다는 이유만으로는 환불되지 않습니다.</li>
      </ul>

      <h2>환불 요청 방법</h2>
      <ol>
        <li>고객센터({contact})로 주문번호(감정서 화면·완성 메일·결제 알림 메일에 있음)와 결제 이메일을 보내 주세요.</li>
        <li>확인 후 영업일 3일 이내에 결제를 취소합니다.</li>
        <li>카드 결제 취소는 카드사에 따라 반영까지 영업일 기준 3~7일이 걸릴 수 있습니다.</li>
      </ol>

      <p className="muted">
        이 규정에 없는 사항은 「전자상거래 등에서의 소비자보호에 관한 법률」과 <a href="/terms">이용약관</a>을 따릅니다.
      </p>
    </PolicyPage>
  );
}
