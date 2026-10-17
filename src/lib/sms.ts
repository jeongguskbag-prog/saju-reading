// 감정서 완성 문자·카카오톡 알림톡(서버 전용). 솔라피(SOLAPI) API로 보낸다.
// 문자: SOLAPI_API_KEY, SOLAPI_API_SECRET, SMS_FROM(솔라피에 등록·인증한 발신번호)
// 알림톡: 위 셋 + KAKAO_PF_ID(솔라피에 연동한 카카오톡 채널 ID), KAKAO_TEMPLATE_ID(카카오 검수를 통과한 템플릿 ID)
// 알림톡이 실패하면(카카오톡 미사용자 등) 같은 내용을 문자로 대신 보낸다.
import { createHmac, randomBytes } from "node:crypto";
import { BRAND, REPORT_VALID_DAYS } from "./product";
import type { Order } from "./orders";
import { josa } from "./josa";

export function isSmsEnabled(): boolean {
  return Boolean(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SMS_FROM);
}

export function isKakaoEnabled(): boolean {
  return isSmsEnabled() && Boolean(process.env.KAKAO_PF_ID && process.env.KAKAO_TEMPLATE_ID);
}

/**
 * 카카오 알림톡 템플릿(솔라피에서 이 문구 그대로 등록해 카카오 검수를 받는다). #{…}는 변수.
 * 상품 이름마다 받침이 달라 조사를 쓰지 않도록 "작성이 완료되었습니다"로 맺는다.
 */
export const KAKAO_TEMPLATE = `[천기록] #{이름} 님, 의뢰하신 #{상품} 작성이 완료되었습니다.

아래 링크에서 감정서를 열고 PDF로 저장하실 수 있습니다.
#{링크}

PDF 파일 받기: #{PDF}
HTML 파일 받기: #{HTML}

열람 기간: #{기한}까지
링크를 아는 사람은 누구나 열 수 있으니 소중히 보관해 주세요.`;

/** 파일 받기 링크 */
export interface FileLinks {
  pdf: string;
  html: string;
}

export function kakaoVariables(order: Order, url: string, expiresAt: string, links?: FileLinks): Record<string, string> {
  return {
    "#{이름}": order.input.name?.trim() || "의뢰인",
    "#{상품}": order.orderName,
    "#{링크}": url,
    "#{PDF}": links?.pdf ?? `${url}/pdf`,
    "#{HTML}": links?.html ?? `${url}/html`,
    "#{기한}": ymd(expiresAt),
  };
}

export const kakaoText = (vars: Record<string, string>) => KAKAO_TEMPLATE.replace(/#\{[^}]+\}/g, (k) => vars[k] ?? k);

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

export function reportSmsText(order: Order, url: string, expiresAt: string, links?: FileLinks): string {
  const name = order.input.name?.trim() || "의뢰인";
  return `[${BRAND.name}] ${name} 님의 ${josa(order.orderName, "이", "가")} 완성되었습니다.
아래 링크에서 감정서를 열고 PDF로 저장하실 수 있습니다.
${url}
${links ? `PDF 파일: ${links.pdf}\nHTML 파일: ${links.html}\n` : ""}열람 기간: ${ymd(expiresAt)}까지(${REPORT_VALID_DAYS}일)
링크를 아는 사람은 누구나 열 수 있으니 소중히 보관해 주세요.`;
}

/** 솔라피 인증 머리글: HMAC-SHA256(날짜+솔트, API 시크릿) */
export function solapiAuth(apiKey: string, secret: string, now = new Date(), salt = randomBytes(16).toString("hex")): string {
  const date = now.toISOString();
  const signature = createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/**
 * 보냈으면 true. 실패해도 결제 흐름을 막지 않는다.
 * 손님이 카카오톡을 고르고 알림톡 설정이 있으면 알림톡, 아니면 문자(90바이트가 넘으면 솔라피가 장문 LMS로)로 보낸다.
 */
export async function sendReportSms(order: Order, url: string, expiresAt: string, links?: FileLinks): Promise<boolean> {
  if (!isSmsEnabled() || !order.phone) return false;
  const kakao = order.channel === "kakao" && isKakaoEnabled();
  const vars = kakao ? kakaoVariables(order, url, expiresAt, links) : null;
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
            // 알림톡은 템플릿 문구와 같은 글을 함께 넣어 두면, 실패할 때 이 글이 문자로 대신 간다.
            text: vars ? kakaoText(vars) : reportSmsText(order, url, expiresAt, links),
            subject: `[${BRAND.name}] 감정서 완성`,
            autoTypeDetect: true,
            ...(vars
              ? { kakaoOptions: { pfId: process.env.KAKAO_PF_ID, templateId: process.env.KAKAO_TEMPLATE_ID, variables: vars, disableSms: false } }
              : {}),
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
