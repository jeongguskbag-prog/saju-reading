// 감정서 파일(PDF·HTML) 발송(서버 전용).
// 결제 직후 Upstash QStash에 "공개 시각(상품별 대기 시간)에 /api/deliver를 불러 달라"고 예약해 두고, 그때 파일을 만들어 보낸다.
// 손님 화면에도 같은 시각부터 감정서 본문이 열린다(그 전에는 명식 미리보기만). 시각은 release.ts에서 정한다.
// 필요한 설정: QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY (선택: QSTASH_URL, DELIVERY_DELAY_MINUTES)
// QStash 설정이 없으면 예전처럼 감정서가 완성되는 즉시 링크를 보낸다.
import { sendReportEmail } from "./mail";
import { isSmsEnabled, phoneChannels, sendReportSms } from "./sms";
import { getSavedParts, markMailed, orderReleaseAt, setDeliverAt, unmarkMailed, type Order, type Report } from "./orders";
import { renderReportFiles, type ReportFiles } from "./render";
import { getStore } from "./store";

/** 주문별 마지막 발송 시도 기록(관리 화면에서 어디서 막혔는지 본다). 40일 보관. */
export interface DeliveryLog {
  at: string;
  outcome: DeliverOutcome;
  /** 파일(PDF·HTML) 만들기: ok 또는 실패 사유 */
  files: string;
  mail: string;
  phone: string;
}
export const deliveryLogKey = (orderId: string) => `delivery-log:${orderId}`;
/** QStash가 부른 요청의 서명이 맞지 않았던 마지막 시각 */
export const SIGNATURE_FAIL_KEY = "delivery-log:signature-fail";

async function writeLog(orderId: string, log: DeliveryLog) {
  await getStore()?.set(deliveryLogKey(orderId), log, 60 * 60 * 24 * 40).catch(() => {});
}

export function isDeliveryScheduleEnabled(): boolean {
  return Boolean(process.env.QSTASH_TOKEN && process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY);
}

const minutesEnv = (raw: string | undefined, fallback: number) => {
  const n = raw === undefined || raw === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 24 * 60 ? n : fallback;
};

/** 신청(결제) 뒤 몇 분 뒤에 파일을 보낼지. 기본 3분. */
export const deliveryDelayMinutes = () => minutesEnv(process.env.DELIVERY_DELAY_MINUTES, 3);

/** 신청(결제) 뒤 몇 분 뒤부터 화면에서 감정서를 보여 줄지. 기본 3분. */
export const webRevealMinutes = () => minutesEnv(process.env.WEB_REVEAL_MINUTES, 3);

/** 이메일이나 휴대폰 번호를 남겼는지(웹 신청서는 남기지 않고 화면에서 바로 저장한다) */
export const hasDestination = (order: Pick<Order, "email" | "phone" | "notify">) =>
  order.notify ? order.notify.length > 0 : Boolean(order.email || order.phone);

/** 이메일로 보낼지: 새 주문은 손님이 이메일을 고른 경우만 */
const wantsEmail = (order: Order) => Boolean(order.email) && (!order.notify || order.notify.includes("email"));

/** 손님에게 받을 파일 주소 */
export function fileLinks(origin: string, token: string) {
  const base = `${origin}/r/${token}`;
  return { view: base, pdf: `${base}/pdf`, html: `${base}/html` };
}

/**
 * 결제 직후 발송을 예약한다. 예약하면 발송 시각(ISO)을, 설정이 없거나 실패하면 null(완성 즉시 발송)을 돌려준다.
 * 예약 시각을 주문에 먼저 적어, 그 사이 감정서가 완성되어도 바로 보내지 않게 한다.
 */
export const scheduleLogKey = (orderId: string) => `delivery-schedule:${orderId}`;
const noteSchedule = (orderId: string, note: string) =>
  getStore()?.set(scheduleLogKey(orderId), { at: new Date().toISOString(), note }, 60 * 60 * 24 * 40).catch(() => {});

export async function scheduleDelivery(order: Order, origin: string, now = new Date()): Promise<string | null> {
  if (!order.token || !hasDestination(order)) return null;
  if (!isDeliveryScheduleEnabled()) {
    await noteSchedule(order.id, "예약 설정(QSTASH) 없음: 감정서 완성 즉시 발송");
    return null;
  }
  // 상품별 공개 시각에 보낸다. 이미 지났으면 곧바로.
  const deliverAt = new Date(Math.max(orderReleaseAt(order).getTime(), now.getTime() + 30_000));
  await setDeliverAt(order.id, deliverAt.toISOString());
  try {
    const { Client } = await import("@upstash/qstash");
    const client = new Client({ token: process.env.QSTASH_TOKEN!, ...(process.env.QSTASH_URL ? { baseUrl: process.env.QSTASH_URL } : {}) });
    await client.publishJSON({
      url: `${origin}/api/deliver`,
      body: { token: order.token },
      notBefore: Math.floor(deliverAt.getTime() / 1000),
      retries: 3,
      deduplicationId: `deliver-${order.id}`,
    });
    await noteSchedule(order.id, `예약됨: ${origin}/api/deliver`);
    return deliverAt.toISOString();
  } catch (error) {
    console.error("발송 예약 실패, 완성 즉시 보냅니다", order.id, error);
    await noteSchedule(order.id, `예약 실패: ${String((error as Error)?.message ?? error).slice(0, 300)}`);
    await setDeliverAt(order.id, null);
    return null;
  }
}

/** QStash가 보낸 요청이 맞는지 서명을 확인한다. */
export async function verifyQstash(signature: string | null, body: string, url: string): Promise<boolean> {
  if (!signature || !isDeliveryScheduleEnabled()) return false;
  const { Receiver } = await import("@upstash/qstash");
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  });
  try {
    return await receiver.verify({ signature, body, url });
  } catch {
    return false;
  }
}

export type DeliverOutcome = "sent" | "already" | "incomplete" | "failed" | "none";

/**
 * 감정서가 다 됐으면 PDF·HTML을 만들어 이메일(첨부)과 문자·카카오톡(받기 링크)으로 보낸다. 주문당 한 번.
 * 파일 만들기에 실패해도 감정서 링크와 받기 링크는 보낸다(받기 링크는 열 때 다시 만든다).
 */
export async function deliverReport(report: Report, origin: string, render = renderReportFiles): Promise<DeliverOutcome> {
  if (!hasDestination(report.order)) return "none";
  const saved = await getSavedParts(report.order.token!, report.product.parts);
  if (report.product.parts.some((p) => !saved[p])) return "incomplete";
  if (!(await markMailed(report.order.id))) return "already";
  let files: ReportFiles | null = null;
  let filesNote = "ok";
  try {
    files = await render(origin, report);
  } catch (error) {
    console.error("감정서 파일 만들기 실패, 링크만 보냅니다", report.order.id, error);
    filesNote = `실패: ${String((error as Error)?.message ?? error).slice(0, 300)}`;
  }
  const links = fileLinks(origin, report.order.token!);
  let mailNote = wantsEmail(report.order) ? "보냄" : "이메일로 받기 안 고름";
  const [mailed, texted] = await Promise.all([
    wantsEmail(report.order)
      ? sendReportEmail(report.order, links.view, report.expiresAt, { files, links }, (m) => (mailNote = m))
      : Promise.resolve(false),
    sendReportSms(report.order, links.view, report.expiresAt, links),
  ]);
  const outcome: DeliverOutcome = mailed || texted ? "sent" : "failed";
  await writeLog(report.order.id, {
    at: new Date().toISOString(),
    outcome,
    files: filesNote,
    mail: mailNote,
    phone: texted
      ? "보냄"
      : !report.order.phone
        ? "번호 없음"
        : !phoneChannels(report.order).length
          ? "안 보냄(손님이 문자·카카오톡을 고르지 않음)"
          : !isSmsEnabled()
            ? "안 보냄(문자 설정 없음)"
            : "실패(위쪽 '마지막 문자·알림톡 발송 실패' 사유 참고)",
  });
  if (outcome === "sent") return "sent";
  await unmarkMailed(report.order.id);
  return "failed";
}
