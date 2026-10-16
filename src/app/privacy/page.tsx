import type { Metadata } from "next";
import PolicyPage from "@/components/PolicyPage";
import { BRAND, BUSINESS, REPORT_VALID_DAYS, orPending } from "@/lib/product";

export const metadata: Metadata = { title: `개인정보처리방침 — ${BRAND.name}` };

const OVERSEAS = [
  {
    to: "Anthropic, PBC",
    country: "미국",
    items: "사주 계산 결과(간지·오행·십신·대운 등), 성별, 출생연도, 태어난 시각을 아는지 여부. 이름·이메일·결제 정보는 보내지 않음",
    purpose: "AI 풀이 작성",
    keep: "풀이 작성 처리 후 Anthropic의 데이터 보존 정책에 따름",
  },
  {
    to: "Vercel Inc.",
    country: "미국",
    items: "서비스 이용 중 전송되는 모든 정보(입력값, 접속 기록)",
    purpose: "웹사이트 호스팅·운영",
    keep: "위탁 계약 종료 또는 회사의 보관 기간 종료 시까지",
  },
  {
    to: "Upstash, Inc.",
    country: "미국",
    items: "주문 정보(주문번호, 성함, 이메일 또는 휴대폰 번호, 생년월일시·성별, 결제 금액·일시·결제키), 작성된 감정서",
    purpose: "주문·감정서 저장",
    keep: "아래 '보유 기간'과 같음",
  },
];

export default function Privacy() {
  const b = BUSINESS;
  const contact = [b.phone, b.email].filter(Boolean).join(" / ") || "등록 예정";
  return (
    <PolicyPage title="개인정보처리방침">
      <p>
        {orPending(b.companyName)}(이하 &ldquo;회사&rdquo;)는 {BRAND.name} 서비스를 제공하면서 이용자의 개인정보를 「개인정보 보호법」에 따라
        다음과 같이 처리합니다.
      </p>

      <h2>1. 처리하는 개인정보와 목적</h2>
      <table className="table">
        <thead>
          <tr><th>구분</th><th>항목</th><th>목적</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>무료 계산</td>
            <td>생년월일, 태어난 시각, 성별, 양력·음력, 이름(선택)</td>
            <td>사주 계산 결과 표시. 계산 후 저장하지 않습니다.</td>
          </tr>
          <tr>
            <td>감정서 신청</td>
            <td>생년월일, 태어난 시각, 성별, 양력·음력, 성함, 이메일 또는 휴대폰 번호(문자로 받기를 고른 경우)</td>
            <td>감정서 작성·제공, 완성 메일 발송, 문의·환불 대응</td>
          </tr>
          <tr>
            <td>상담·문의</td>
            <td>카카오톡 프로필 이름, 이메일 주소, 상담 내용(이용자가 보낸 정보)</td>
            <td>결제·이용 방법 안내, 문의 답변. 상담 기록은 소비자 불만·분쟁 처리 기록으로 3년간 보관</td>
          </tr>
          <tr>
            <td>결제</td>
            <td>주문번호, 결제 금액·수단·일시, 결제 키</td>
            <td>결제 확인, 환불, 법령에 따른 거래 기록 보관. 카드번호 등은 토스페이먼츠가 처리하며 회사는 받지 않습니다.</td>
          </tr>
        </tbody>
      </table>

      <h2>2. 보유 기간</h2>
      <ul>
        <li>결제하지 않은 주문: 주문 후 48시간이 지나면 자동으로 삭제합니다.</li>
        <li>작성된 감정서 풀이: 결제일로부터 {REPORT_VALID_DAYS}일(열람 기간)이 지나고 하루 뒤 자동으로 삭제합니다.</li>
        <li>결제한 주문 정보(성함·생년월일시·이메일·휴대폰 번호 등): 아래 법정 보관 기간 동안 보관하며, 삭제를 요청하면 법정 보관 대상(결제 기록)을 제외하고 지체 없이 삭제합니다.</li>
        <li>
          다만 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 계약·청약철회 및 대금 결제 기록은 5년, 소비자 불만·분쟁 처리 기록은 3년간
          보관합니다(주문번호, 이메일, 결제 금액·일시에 한함).
        </li>
      </ul>

      <h2>3. 처리 위탁</h2>
      <table className="table">
        <thead>
          <tr><th>받는 곳</th><th>위탁 업무</th></tr>
        </thead>
        <tbody>
          <tr><td>토스페이먼츠(주)</td><td>결제 처리</td></tr>
          <tr><td>(주)카카오</td><td>카카오톡 채널 1:1 상담(카카오톡 상담을 이용하는 경우)</td></tr>
          <tr><td>Vercel Inc.</td><td>웹사이트 호스팅</td></tr>
          <tr><td>Upstash, Inc.</td><td>주문·감정서 저장</td></tr>
          <tr><td>Anthropic, PBC</td><td>AI 풀이 작성</td></tr>
          <tr><td>Resend, Inc.</td><td>감정서 완성 메일 발송</td></tr>
          <tr><td>솔라피(SOLAPI)</td><td>감정서 완성 문자 발송(문자로 받기를 고른 경우)</td></tr>
        </tbody>
      </table>

      <h2>4. 국외 이전</h2>
      <p>
        서비스 제공을 위해 아래와 같이 개인정보가 국외로 이전됩니다. 이전은 서비스를 이용하는 시점에 암호화된 네트워크로 이루어집니다. 국외
        이전을 원하지 않으면 서비스를 이용하지 않거나 삭제를 요청할 수 있으나, 이 경우 서비스 제공이 어렵습니다.
      </p>
      <table className="table">
        <thead>
          <tr><th>받는 곳(국가)</th><th>항목</th><th>목적</th><th>보유 기간</th></tr>
        </thead>
        <tbody>
          {OVERSEAS.map((o) => (
            <tr key={o.to}>
              <td>{o.to}({o.country})</td>
              <td>{o.items}</td>
              <td>{o.purpose}</td>
              <td>{o.keep}</td>
            </tr>
          ))}
          <tr>
            <td>Resend, Inc.(미국)</td>
            <td>이메일, 성함, 감정서 링크</td>
            <td>감정서 완성 메일 발송</td>
            <td>발송 후 Resend의 보존 정책에 따름</td>
          </tr>
        </tbody>
      </table>

      <h2>5. 이용자의 권리</h2>
      <p>
        이용자는 언제든 자신의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다. 고객센터로 주문번호와 결제 이메일을 보내 주시면 본인
        확인 후 지체 없이 처리합니다.
      </p>

      <h2>6. 쿠키</h2>
      <p>서비스는 로그인이나 광고를 위한 쿠키를 사용하지 않습니다.</p>

      <h2>7. 안전성 확보 조치</h2>
      <p>
        모든 통신은 암호화(HTTPS)되며, 저장소 접근 키는 서버에서만 사용합니다. 감정서 링크에는 추측하기 어려운 무작위 값을 쓰고 검색엔진에
        노출하지 않습니다.
      </p>

      <h2>8. 개인정보 보호책임자</h2>
      <p>
        책임자: {orPending(b.privacyOfficer)} · 연락처: {contact}
      </p>
      <p className="muted">개인정보 침해 신고·상담: 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회(1833-6972)</p>
    </PolicyPage>
  );
}
