// 감정서 완성 문자·카카오톡 알림톡(서버 전용). 솔라피(SOLAPI) API로 보낸다.
// 문자: SOLAPI_API_KEY, SOLAPI_API_SECRET, SMS_FROM(솔라피에 등록·인증한 발신번호)
// 알림톡: 위 셋 + KAKAO_PF_ID(솔라피에 연동한 카카오톡 채널 ID), KAKAO_TEMPLATE_ID(카카오 검수를 통과한 템플릿 ID)
// 알림톡이 실패하면(카카오톡 미사용자 등) 같은 내용을 문자로 대신 보낸다.
import { createHmac, randomBytes } from "node:crypto";
import { BRAND, REPORT_VALID_DAYS } from "./product";
import type { Order } from "./orders";
import { josa } from "./josa";
import { getStore } from "./store";

/** 마지막 문자·알림톡 발송 실패(관리 화면에 보여 준다). 비밀값은 담지 않는다. */
export const SMS_FAIL_KEY = "delivery-log:sms-fail";
const noteSmsFail = (detail: string) =>
  getStore()?.set(SMS_FAIL_KEY, { at: new Date().toISOString(), detail: detail.slice(0, 400) }, 60 * 60 * 24 * 40).catch(() => {});

export type PhoneChannel = "kakao" | "sms";

/** 휴대폰으로 보낼 곳. 예전 주문(channel 하나)도 같은 모양으로 돌려준다. */
export function phoneChannels(order: Pick<Order, "phone" | "channels" | "channel" | "notify">): PhoneChannel[] {
  if (!order.phone) return [];
  // 새 주문: 손님이 고른 곳만(휴대폰 번호만 남기고 카카오톡·문자를 고르지 않았으면 보내지 않는다)
  if (order.notify) return order.channels ?? [];
  return order.channels?.length ? order.channels : [order.channel ?? "sms"];
}

export function isSmsEnabled(): boolean {
  return Boolean(process.env.SOLAPI_API_KEY && process.env.SOLAPI_API_SECRET && process.env.SMS_FROM);
}

/** 카카오톡 알림톡을 쓸 수 있는지: 결제 확인(KAKAO_RECEIPT_TEMPLATE_ID)과 파일 발송(KAKAO_TEMPLATE_ID) 템플릿 가운데 하나라도 있으면 고를 수 있다. */
export function isKakaoEnabled(): boolean {
  return isSmsEnabled() && Boolean(process.env.KAKAO_PF_ID && (process.env.KAKAO_TEMPLATE_ID || process.env.KAKAO_RECEIPT_TEMPLATE_ID));
}

/** 파일 발송 알림톡 템플릿이 있는지 */
export const hasKakaoFileTemplate = () => isSmsEnabled() && Boolean(process.env.KAKAO_PF_ID && process.env.KAKAO_TEMPLATE_ID);

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
 * 손님이 고른 곳 모두로 보낸다: 카카오톡(알림톡)과 문자를 함께 골랐으면 둘 다 간다.
 * 카카오톡만 골랐을 때 알림톡이 실패하면(카카오톡 미사용자 등) 같은 내용이 문자로 대신 간다.
 */
export async function sendReportSms(order: Order, url: string, expiresAt: string, links?: FileLinks): Promise<boolean> {
  const chosen = phoneChannels(order);
  const channels = chosen.filter((c) => (c === "kakao" ? hasKakaoFileTemplate() : isSmsEnabled()));
  // 카카오톡을 골랐는데 알림톡 템플릿이 빠졌으면 문자로라도 보낸다.
  if (!channels.length && chosen.length && isSmsEnabled()) channels.push("sms");
  if (!isSmsEnabled() || !order.phone || !channels.length) return false;
  const from = process.env.SMS_FROM!.replace(/\D/g, "");
  const subject = `[${BRAND.name}] 감정서 완성`;
  const messages = channels.map((c) => {
    if (c === "sms") return { to: order.phone, from, text: reportSmsText(order, url, expiresAt, links), subject, autoTypeDetect: true };
    const vars = kakaoVariables(order, url, expiresAt, links);
    return {
      to: order.phone,
      from,
      // 알림톡은 템플릿 문구와 같은 글을 함께 넣어 두면, 실패할 때 이 글이 문자로 대신 간다(문자도 고른 경우는 겹치지 않게 끈다).
      text: kakaoText(vars),
      subject,
      autoTypeDetect: true,
      kakaoOptions: { pfId: process.env.KAKAO_PF_ID, templateId: process.env.KAKAO_TEMPLATE_ID, variables: vars, disableSms: channels.includes("sms") },
    };
  });
  return solapiSend(messages);
}

/** 솔라피로 메시지 묶음을 보낸다. 하나라도 갔으면 true. */
export async function solapiSend(messages: Record<string, unknown>[]): Promise<boolean> {
  if (!isSmsEnabled() || !messages.length) return false;
  const base = (process.env.SOLAPI_API_BASE || "https://api.solapi.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/messages/v4/send-many/detail`, {
      method: "POST",
      headers: {
        Authorization: solapiAuth(process.env.SOLAPI_API_KEY!, process.env.SOLAPI_API_SECRET!),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      failedMessageList?: { statusCode?: string; statusMessage?: string }[];
      errorCode?: string;
      errorMessage?: string;
    };
    const failed = Array.isArray(data.failedMessageList) ? data.failedMessageList : [];
    if (!res.ok || failed.length) {
      console.error("문자 발송 실패", res.status, JSON.stringify(data).slice(0, 500));
      const reason = !res.ok
        ? `솔라피 거절(${res.status}) ${data.errorCode ?? ""} ${data.errorMessage ?? ""}`
        : failed.map((f) => `${f.statusCode ?? ""} ${f.statusMessage ?? ""}`.trim()).join(" / ");
      await noteSmsFail(reason.trim());
    } else {
      await getStore()?.del(SMS_FAIL_KEY).catch(() => {});
    }
    return res.ok && failed.length < messages.length;
  } catch (error) {
    console.error("문자 발송 실패", error);
    await noteSmsFail(`연결 실패: ${String((error as Error)?.message ?? error)}`);
    return false;
  }
}
