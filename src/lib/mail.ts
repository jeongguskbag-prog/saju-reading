// 감정서 완성 메일(서버 전용). RESEND_API_KEY와 MAIL_FROM이 있을 때만 보낸다.
import { BRAND, REPORT_VALID_DAYS, won } from "./product";
import type { Order } from "./orders";
import { josa } from "./josa";

export function isMailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ymd = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000); // 한국 시간
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
};

/** 감정서 완성 메일. 문구는 천기록 안내문을 따른다. */
export function reportEmail(order: Order, url: string, expiresAt: string) {
  const name = order.input.name?.trim() || "의뢰인";
  const subject = `[${BRAND.name}] 의뢰하신 ${name} 님의 맞춤 감정서가 완성되었습니다`;
  const until = ymd(expiresAt);
  const text = `[${BRAND.name}] 의뢰하신 ${name} 님의 맞춤 감정서가 완성되었습니다.

의뢰인님의 사주 명식에 깃든 오행의 분포와 대운의 흐름을 정밀하게 계산하고 감정한 [${josa(order.orderName, "]이", "]가")} 완성되었습니다.
아래 링크에서 감정서를 열고 PDF로 저장하실 수 있습니다.

${url}

운(運)은 정해진 종착역이 아니라, 내가 가진 배의 모양과 바다의 조류(潮流)를 아는 지혜입니다.
본 감정서가 의뢰인님의 앞날에 가장 든든한 등대이자 인생의 나침반이 되기를 진심으로 기원합니다.

* 감정서 열람 기간: ${until}까지(결제일로부터 ${REPORT_VALID_DAYS}일). 기간 안에 PDF로 저장해 두세요.
* 본 기록은 의뢰인 고유의 명식 데이터로 작성된 비밀 문서입니다. 링크를 아는 사람은 누구나 열 수 있으니 소중히 보관해 주세요.
* 주문번호 ${order.id} / 결제 금액 ${won(order.amount)}

- 天機錄 운명연구원 배상`;
  const e = escapeHtml;
  const html = `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.8;color:#2a2926;max-width:560px;margin:0 auto;padding:8px">
<p style="font-size:13px;letter-spacing:.3em;color:#b0262c;margin:0 0 4px">天 機 錄</p>
<h1 style="font-size:20px;margin:0 0 20px;font-weight:700">의뢰하신 ${e(name)} 님의 맞춤 감정서가 완성되었습니다.</h1>
<p>의뢰인님의 사주 명식에 깃든 오행의 분포와 대운의 흐름을 정밀하게 계산하고 감정한 <b>[${e(order.orderName)}]</b>${josa(order.orderName, "이", "가").slice(order.orderName.length)} 완성되었습니다. 아래 버튼을 눌러 감정서를 열고 PDF로 저장하실 수 있습니다.</p>
<p style="margin:24px 0"><a href="${e(url)}" style="display:inline-block;background:#b0262c;color:#ffffff;padding:14px 26px;border-radius:4px;text-decoration:none;font-weight:700">감정서 열기</a></p>
<p style="border-left:3px solid #b0262c;padding-left:14px;color:#57544d">운(運)은 정해진 종착역이 아니라,<br>내가 가진 배의 모양과 바다의 조류(潮流)를 아는 지혜입니다.</p>
<p>본 감정서가 의뢰인님의 앞날에 가장 든든한 등대이자 인생의 나침반이 되기를 진심으로 기원합니다.</p>
<ul style="font-size:13px;color:#57544d;padding-left:18px">
<li>감정서 열람 기간: <b>${e(until)}까지</b>(결제일로부터 ${REPORT_VALID_DAYS}일). 기간 안에 PDF로 저장해 두세요.</li>
<li>본 기록은 의뢰인 고유의 명식 데이터로 작성된 비밀 문서입니다. 링크를 아는 사람은 누구나 열 수 있으니 소중히 보관해 주세요.</li>
<li>주문번호 ${e(order.id)} · 결제 금액 ${won(order.amount)}</li>
</ul>
<p style="margin-top:24px">- 天機錄 운명연구원 배상</p>
<p style="font-size:12px;color:#7c7870">버튼이 열리지 않으면 이 주소를 복사해 브라우저에 붙여 넣으세요: ${e(url)}</p>
</div>`;
  return { subject, html, text };
}

/** 보냈으면 true. 메일 실패는 결제 흐름을 막지 않는다. */
export async function sendReportEmail(order: Order, url: string, expiresAt: string): Promise<boolean> {
  if (!isMailEnabled()) return false;
  const { subject, html, text } = reportEmail(order, url, expiresAt);
  try {
    const res = await fetch(`${(process.env.RESEND_API_BASE || "https://api.resend.com").replace(/\/$/, "")}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [order.email], subject, html, text }),
    });
    if (!res.ok) console.error("메일 발송 실패", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (error) {
    console.error("메일 발송 실패", error);
    return false;
  }
}
