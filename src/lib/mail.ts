// 리포트 링크 메일(서버 전용). RESEND_API_KEY와 MAIL_FROM이 있을 때만 보낸다.
import { BRAND, won } from "./product";
import type { Order } from "./orders";

export function isMailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function reportEmail(order: Order, url: string) {
  const who = order.input.name?.trim() ? `${order.input.name.trim()}님` : "고객님";
  const subject = `[${BRAND.name}] ${who}의 ${order.orderName} 링크입니다`;
  const html = `<div style="font-family:sans-serif;line-height:1.7;color:#2a2926;max-width:520px">
<p>${escapeHtml(who)}, ${escapeHtml(BRAND.name)}을 찾아 주셔서 고맙습니다.</p>
<p>아래 링크에서 리포트를 언제든 다시 열 수 있습니다. 처음 열 때 풀이를 작성하느라 1~2분 걸립니다.</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#b0262c;color:#fff;padding:12px 20px;border-radius:4px;text-decoration:none">리포트 열기</a></p>
<p style="font-size:13px;color:#57544d">링크를 아는 사람은 누구나 리포트를 볼 수 있으니 다른 사람과 공유하지 마세요.<br>
주문번호 ${escapeHtml(order.id)} · 결제 금액 ${won(order.amount)}</p>
</div>`;
  return { subject, html };
}

/** 보냈으면 true. 메일 실패는 결제 흐름을 막지 않는다. */
export async function sendReportEmail(order: Order, url: string): Promise<boolean> {
  if (!isMailEnabled()) return false;
  const { subject, html } = reportEmail(order, url);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [order.email], subject, html }),
    });
    if (!res.ok) console.error("메일 발송 실패", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (error) {
    console.error("메일 발송 실패", error);
    return false;
  }
}
