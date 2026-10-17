// 감정서 파일(PDF·HTML) 발송(서버 전용).
// 결제 직후 Upstash QStash에 "신청 10분 뒤 /api/deliver를 불러 달라"고 예약해 두고, 그때 파일을 만들어 보낸다.
// 손님 화면에는 신청 3분 뒤부터 감정서가 보이고, 이메일·카카오톡·문자 발송은 예약 시각(10분 뒤)에 맞춘다.
// 필요한 설정: QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY (선택: QSTASH_URL, DELIVERY_DELAY_MINUTES)
// QStash 설정이 없으면 예전처럼 감정서가 완성되는 즉시 링크를 보낸다.
import { sendReportEmail } from "./mail";
import { sendReportSms } from "./sms";
import { getSavedParts, markMailed, setDeliverAt, unmarkMailed, type Order, type Report } from "./orders";
import { renderReportFiles, type ReportFiles } from "./render";

export function isDeliveryScheduleEnabled(): boolean {
  return Boolean(process.env.QSTASH_TOKEN && process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY);
}

const minutesEnv = (raw: string | undefined, fallback: number) => {
  const n = raw === undefined || raw === "" ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 24 * 60 ? n : fallback;
};

/** 신청(결제) 뒤 몇 분 뒤에 파일을 보낼지. 기본 10분. */
export const deliveryDelayMinutes = () => minutesEnv(process.env.DELIVERY_DELAY_MINUTES, 10);

/** 신청(결제) 뒤 몇 분 뒤부터 화면에서 감정서를 보여 줄지. 기본 3분. */
export const webRevealMinutes = () => minutesEnv(process.env.WEB_REVEAL_MINUTES, 3);

/** 이메일이나 휴대폰 번호를 남겼는지(웹 신청서는 남기지 않고 화면에서 바로 저장한다) */
export const hasDestination = (order: Pick<Order, "email" | "phone">) => Boolean(order.email || order.phone);

/** 손님에게 받을 파일 주소 */
export function fileLinks(origin: string, token: string) {
  const base = `${origin}/r/${token}`;
  return { view: base, pdf: `${base}/pdf`, html: `${base}/html` };
}

/**
 * 결제 직후 발송을 예약한다. 예약하면 발송 시각(ISO)을, 설정이 없거나 실패하면 null(완성 즉시 발송)을 돌려준다.
 * 예약 시각을 주문에 먼저 적어, 그 사이 감정서가 완성되어도 바로 보내지 않게 한다.
 */
export async function scheduleDelivery(order: Order, origin: string, now = new Date()): Promise<string | null> {
  if (!isDeliveryScheduleEnabled() || !order.token || !hasDestination(order)) return null;
  const paidAt = new Date(order.paidAt ?? now.toISOString()).getTime();
  const deliverAt = new Date(paidAt + deliveryDelayMinutes() * 60_000);
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
    return deliverAt.toISOString();
  } catch (error) {
    console.error("발송 예약 실패, 완성 즉시 보냅니다", order.id, error);
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
  try {
    files = await render(origin, report);
  } catch (error) {
    console.error("감정서 파일 만들기 실패, 링크만 보냅니다", report.order.id, error);
  }
  const links = fileLinks(origin, report.order.token!);
  const [mailed, texted] = await Promise.all([
    report.order.email ? sendReportEmail(report.order, links.view, report.expiresAt, { files, links }) : Promise.resolve(false),
    sendReportSms(report.order, links.view, report.expiresAt, links),
  ]);
  if (mailed || texted) return "sent";
  await unmarkMailed(report.order.id);
  return "failed";
}
