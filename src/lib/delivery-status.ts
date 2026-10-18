// 관리 화면의 '발송 점검'(서버 전용): 발송에 쓰는 설정이 있는지(이름만)와, 주문별로 어디까지 보냈는지.
import { deliveryLogKey, isDeliveryScheduleEnabled, scheduleLogKey, SIGNATURE_FAIL_KEY, type DeliveryLog } from "./delivery";
import { isMailEnabled } from "./mail";
import type { Order } from "./orders";
import { isKakaoEnabled, isSmsEnabled } from "./sms";
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
    { name: "3분 뒤 발송 예약(QStash)", ok: isDeliveryScheduleEnabled(), note: "QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY" },
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
      mailed: await store.get<string>(`mailed:${o.id}`),
      log: await store.get<DeliveryLog>(deliveryLogKey(o.id)),
    })),
  );
}

export const lastSignatureFail = async () => (await getStore()?.get<{ at: string; url: string }>(SIGNATURE_FAIL_KEY)) ?? null;
