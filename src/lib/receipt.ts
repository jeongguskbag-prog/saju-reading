// 결제 확인(주문번호·결제 내역) 발송(서버 전용). 결제가 승인되면 손님이 고른 곳(이메일·카카오톡·문자) 모두로 한 번 보낸다.
// 카카오톡 알림톡은 KAKAO_RECEIPT_TEMPLATE_ID(아래 RECEIPT_KAKAO_TEMPLATE 문구로 카카오 검수)가 있어야 하고, 없으면 문자로 대신 보낸다.
import { isMailEnabled } from "./mail";
import { BRAND, REPORT_VALID_DAYS, won } from "./product";
import type { Order } from "./orders";
import { requireStore } from "./store";
import { isSmsEnabled, phoneChannels, solapiSend } from "./sms";

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 한국 시간 2026.10.17 10:45 */
export function kstDateTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export interface ReceiptLinks {
  /** 감정서 화면 */
  report: string;
  /** 주문 조회(주문번호 + 연락처) */
  lookup: string;
}

export const receiptLinks = (origin: string, order: Order): ReceiptLinks => ({
  report: `${origin}/r/${order.token}`,
  lookup: `${origin}/order`,
});

/** 결제 내역 줄들(이메일·문자 공통) */
export function receiptLines(order: Order): [string, string][] {
  return [
    ["주문번호", order.id],
    ["상품", order.orderName],
    ["결제 금액", `${won(order.amount)}${order.method ? ` (${order.method})` : ""}`],
    ["결제 일시", kstDateTime(order.paidAt ?? order.createdAt)],
  ];
}

/** 카카오 알림톡 결제 확인 템플릿(솔라피에서 이 문구 그대로 등록해 카카오 검수를 받는다). #{…}는 변수. */
export const RECEIPT_KAKAO_TEMPLATE = `[천기록] 결제가 완료되었습니다.

#{이름} 님, 의뢰해 주셔서 감사합니다.

주문번호: #{주문번호}
상품: #{상품}
결제 금액: #{금액}
결제 일시: #{일시}

감정서 보기: #{링크}
결제 약 3분 뒤부터 열리며, PDF·HTML 파일로 저장하실 수 있습니다.

주문 조회: #{조회}
주문번호와 연락처로 감정서를 다시 찾을 수 있습니다.`;

export function receiptKakaoVariables(order: Order, links: ReceiptLinks): Record<string, string> {
  const [, , amount, at] = receiptLines(order);
  return {
    "#{이름}": order.input.name?.trim() || "의뢰인",
    "#{주문번호}": order.id,
    "#{상품}": order.orderName,
    "#{금액}": amount[1],
    "#{일시}": at[1],
    "#{링크}": links.report,
    "#{조회}": links.lookup,
  };
}

export const receiptKakaoText = (vars: Record<string, string>) => RECEIPT_KAKAO_TEMPLATE.replace(/#\{[^}]+\}/g, (k) => vars[k] ?? k);

export function receiptSmsText(order: Order, links: ReceiptLinks): string {
  return `[${BRAND.name}] 결제가 완료되었습니다.
${receiptLines(order)
  .map(([k, v]) => `${k}: ${v}`)
  .join("\n")}
감정서 보기(결제 약 3분 뒤부터): ${links.report}
주문 조회: ${links.lookup}${order.receiptUrl ? `\n카드 영수증: ${order.receiptUrl}` : ""}`;
}

export function receiptEmail(order: Order, links: ReceiptLinks) {
  const name = order.input.name?.trim() || "의뢰인";
  const subject = `[${BRAND.name}] 결제가 완료되었습니다 (주문번호 ${order.id})`;
  const lines = receiptLines(order);
  const text = `[${BRAND.name}] ${name} 님, 결제가 완료되었습니다.

${lines.map(([k, v]) => `${k}: ${v}`).join("\n")}

감정서 보기: ${links.report}
결제 약 3분 뒤부터 열리며, PDF 파일과 HTML 문서로 저장하실 수 있습니다.

주문 조회: ${links.lookup}
주문번호와 이 메일 주소(또는 휴대폰 번호)로 감정서를 다시 찾을 수 있습니다. 열람 기간은 결제일로부터 ${REPORT_VALID_DAYS}일입니다.
${order.receiptUrl ? `\n카드 영수증: ${order.receiptUrl}\n` : ""}
- 天機錄 운명연구원`;
  const e = escapeHtml;
  const html = `<div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;line-height:1.8;color:#2a2926;max-width:560px;margin:0 auto;padding:8px">
<p style="font-size:13px;letter-spacing:.3em;color:#b0262c;margin:0 0 4px">天 機 錄</p>
<h1 style="font-size:20px;margin:0 0 16px;font-weight:700">${e(name)} 님, 결제가 완료되었습니다.</h1>
<table style="border-collapse:collapse;width:100%;font-size:14px;margin:0 0 20px">
${lines.map(([k, v]) => `<tr><th style="text-align:left;padding:8px 10px;border-bottom:1px solid #e3e0d8;color:#57544d;font-weight:400;width:90px">${e(k)}</th><td style="padding:8px 10px;border-bottom:1px solid #e3e0d8"><b>${e(v)}</b></td></tr>`).join("\n")}
</table>
<p style="margin:0 0 6px"><a href="${e(links.report)}" style="display:inline-block;background:#b0262c;color:#ffffff;padding:13px 24px;border-radius:4px;text-decoration:none;font-weight:700">감정서 보기</a></p>
<p style="font-size:13px;color:#57544d;margin:0 0 18px">결제 약 3분 뒤부터 열리며, PDF 파일과 HTML 문서로 저장하실 수 있습니다.</p>
<p style="font-size:13px;color:#57544d">감정서 주소를 잃어버리셨다면 <a href="${e(links.lookup)}" style="color:#b0262c">주문 조회</a>에서 주문번호와 이 메일 주소(또는 휴대폰 번호)로 다시 찾을 수 있습니다. 열람 기간은 결제일로부터 ${REPORT_VALID_DAYS}일입니다.</p>
${order.receiptUrl ? `<p style="font-size:13px"><a href="${e(order.receiptUrl)}" style="color:#b0262c">카드 영수증 보기</a></p>` : ""}
<p style="margin-top:20px">- 天機錄 운명연구원</p>
</div>`;
  return { subject, html, text };
}

async function sendReceiptEmail(order: Order, links: ReceiptLinks): Promise<boolean> {
  if (!isMailEnabled() || !order.email) return false;
  const { subject, html, text } = receiptEmail(order, links);
  try {
    const res = await fetch(`${(process.env.RESEND_API_BASE || "https://api.resend.com").replace(/\/$/, "")}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [order.email], subject, html, text }),
    });
    if (!res.ok) console.error("결제 확인 메일 실패", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (error) {
    console.error("결제 확인 메일 실패", error);
    return false;
  }
}

async function sendReceiptPhone(order: Order, links: ReceiptLinks): Promise<boolean> {
  const chosen = phoneChannels(order);
  if (!isSmsEnabled() || !order.phone || !chosen.length) return false;
  const kakaoReady = Boolean(process.env.KAKAO_PF_ID && process.env.KAKAO_RECEIPT_TEMPLATE_ID);
  const channels = chosen.map((c) => (c === "kakao" && !kakaoReady ? "sms" : c)).filter((c, i, a) => a.indexOf(c) === i);
  const from = process.env.SMS_FROM!.replace(/\D/g, "");
  const subject = `[${BRAND.name}] 결제 완료`;
  const messages = channels.map((c) => {
    if (c === "sms") return { to: order.phone, from, text: receiptSmsText(order, links), subject, autoTypeDetect: true };
    const vars = receiptKakaoVariables(order, links);
    return {
      to: order.phone,
      from,
      text: receiptKakaoText(vars),
      subject,
      autoTypeDetect: true,
      kakaoOptions: {
        pfId: process.env.KAKAO_PF_ID,
        templateId: process.env.KAKAO_RECEIPT_TEMPLATE_ID,
        variables: vars,
        disableSms: channels.includes("sms"),
      },
    };
  });
  return solapiSend(messages);
}

/** 결제 확인을 고른 곳 모두로 한 번 보낸다. 새로고침 등으로 다시 불려도 다시 보내지 않는다. */
export async function sendReceipt(order: Order, origin: string): Promise<boolean> {
  const notify = order.notify ?? [];
  if (!notify.length || !order.token) return false;
  if (!(await requireStore().setIfAbsent(`receipt:${order.id}`, new Date().toISOString(), 60 * 60 * 24 * 40))) return false;
  const links = receiptLinks(origin, order);
  const [mailed, texted] = await Promise.all([
    notify.includes("email") ? sendReceiptEmail(order, links) : Promise.resolve(false),
    sendReceiptPhone(order, links),
  ]);
  const ok = mailed || texted;
  if (!ok) await requireStore().del(`receipt:${order.id}`);
  return ok;
}
