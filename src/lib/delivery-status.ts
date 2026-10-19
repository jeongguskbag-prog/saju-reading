// 관리 화면의 '발송 점검'(서버 전용): 발송에 쓰는 설정이 있는지(이름만)와, 주문별로 어디까지 보냈는지.
import { deliveryLogKey, isDeliveryScheduleEnabled, scheduleLogKey, SIGNATURE_FAIL_KEY, type DeliveryLog } from "./delivery";
import { isMailEnabled } from "./mail";
import { isReleased, orderReleaseAt, type Order } from "./orders";
import { isKakaoEnabled, isSmsEnabled, SMS_FAIL_KEY } from "./sms";
import { getStore } from "./store";

export function deliverySettings(): { name: string; ok: boolean; note: string }[] {
  const mailFrom = process.env.MAIL_FROM ?? "";
  return [
    { name: "이메일(Resend)", ok: isMailEnabled(), note: "RESEND_API_KEY, MAIL_FROM" },
    {
      name: "보내는 주소",
      ok: Boolean(mailFrom) && !/resend\.dev/i.test(mailFrom),
      note: /resend\.dev/i.test(mailFrom)
        ? "resend.dev 주소는 Resend 가입 이메일로만 보낼 수 있습니다. 손님에게 보내려면 Resend에서 도메인을 인증하세요."
        : mailFrom
          ? mailFrom.replace(/<.*>/, "").trim() || "설정됨"
          : "MAIL_FROM 없음",
    },
    { name: "공개 시각 발송 예약(QStash)", ok: isDeliveryScheduleEnabled(), note: "QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY" },
    { name: "문자(솔라피)", ok: isSmsEnabled(), note: "SOLAPI_API_KEY, SOLAPI_API_SECRET, SMS_FROM" },
    { name: "카카오 알림톡", ok: isKakaoEnabled(), note: "KAKAO_PF_ID, KAKAO_TEMPLATE_ID" },
  ];
}

export interface OrderDelivery {
  orderId: string;
  name: string;
  paidAt?: string;
  email: string;
  receipt: string | null;
  schedule: { at: string; note: string } | null;
  deliverAt?: string;
  /** 본문 공개·발송 시각(ISO)과 지났는지 */
  releaseAt?: string;
  released: boolean;
  cancelled: boolean;
  mailed: string | null;
  log: DeliveryLog | null;
}

export async function orderDeliveries(orders: Order[]): Promise<OrderDelivery[]> {
  const store = getStore();
  if (!store) return [];
  return Promise.all(
    orders.map(async (o) => ({
      orderId: o.id,
      name: o.input.name ?? "",
      paidAt: o.paidAt,
      email: o.notify && !o.notify.includes("email") ? "" : o.email,
      receipt: await store.get<string>(`receipt:${o.id}`),
      schedule: await store.get<{ at: string; note: string }>(scheduleLogKey(o.id)),
      deliverAt: o.deliverAt,
      releaseAt: orderReleaseAt(o).toISOString(),
      released: isReleased(o),
      cancelled: o.status === "cancelled",
      mailed: await store.get<string>(`mailed:${o.id}`),
      log: await store.get<DeliveryLog>(deliveryLogKey(o.id)),
    })),
  );
}

export const lastSmsFail = async () => (await getStore()?.get<{ at: string; detail: string }>(SMS_FAIL_KEY)) ?? null;
export const lastSignatureFail = async () => (await getStore()?.get<{ at: string; url: string }>(SIGNATURE_FAIL_KEY)) ?? null;

export interface ClientError {
  at: string;
  path: string;
  message: string;
  digest: string;
  stack: string;
  ua: string;
}

/** 손님 화면에서 난 오류(최근 순) */
export async function recentClientErrors(limit = 20): Promise<ClientError[]> {
  const raw = (await getStore()?.listRange("client-errors", 0, limit - 1)) ?? [];
  return raw.flatMap((r) => {
    try {
      return [JSON.parse(r) as ClientError];
    } catch {
      return [];
    }
  });
}
