// 감정서 완성 문자(서버 전용). 솔라피(SOLAPI) 문자 API로 보낸다.
// 필요한 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SMS_FROM(솔라피에 등록·인증한 발신번호)
import { createHmac, randomBytes } from "node:crypto";
import { BRAND, REPORT_VALID_DAYS } from "./product";
import type { Order } from "./orders";
import { josa } from "./josa";

export function isSmsEnabled(): boolean {
  return Boolean(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SMS_FROM);
}

/** 휴대폰 번호를 숫자만 남겨 확인한다(010·011·016~019). 아니면 null. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+?82/, "0");
  return /^01[016789]\d{7,8}$/.test(digits) ? digits : null;
}

/** 화면에 보여 줄 때 가운데를 가린다: 010-****-5678 */
export const maskPhone = (p: string) => `${p.slice(0, 3)}-****-${p.slice(-4)}`;

const ymd = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000); // 한국 시간
  return `${d.getUTCFullYear()}.${d.getUTCMonth() + 1}.${d.getUTCDate()}`;
};

export function reportSmsText(order: Order, url: string, expiresAt: string): string {
  const name = order.input.name?.trim() || "의뢰인";
  return `[${BRAND.name}] ${name} 님의 ${josa(order.orderName, "이", "가")} 완성되었습니다.
아래 링크에서 감정서를 열고 PDF로 저장하실 수 있습니다.
${url}
열람 기간: ${ymd(expiresAt)}까지(${REPORT_VALID_DAYS}일)
링크를 아는 사람은 누구나 열 수 있으니 소중히 보관해 주세요.`;
}

/** 솔라피 인증 머리글: HMAC-SHA256(날짜+솔트, API 시크릿) */
export function solapiAuth(apiKey: string, secret: string, now = new Date(), salt = randomBytes(16).toString("hex")): string {
  const date = now.toISOString();
  const signature = createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 보냈으면 true. 문자 실패는 결제 흐름을 막지 않는다. 90바이트가 넘으면 솔라피가 장문(LMS)으로 보낸다. */
export async function sendReportSms(order: Order, url: string, expiresAt: string): Promise<boolean> {
  if (!isSmsEnabled() || !order.phone) return false;
  const base = (process.env.SOLAPI_API_BASE || "https://api.solapi.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/messages/v4/send-many/detail`, {
      method: "POST",
      headers: {
        Authorization: solapiAuth(process.env.SOLAPI_API_KEY!, process.env.SOLAPI_API_SECRET!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            to: order.phone,
            from: process.env.SMS_FROM!.replace(/\D/g, ""),
            text: reportSmsText(order, url, expiresAt),
            subject: `[${BRAND.name}] 감정서 완성`,
            autoTypeDetect: true,
          },
        ],
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { failedMessageList?: unknown[] };
    const failed = Array.isArray(data.failedMessageList) && data.failedMessageList.length > 0;
    if (!res.ok || failed) console.error("문자 발송 실패", res.status, JSON.stringify(data).slice(0, 500));
    return res.ok && !failed;
  } catch (error) {
    console.error("문자 발송 실패", error);
    return false;
  }
}
