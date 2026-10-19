// 주문 조회(서버 전용): 주문번호와, 주문할 때 적은 이메일 또는 휴대폰 번호가 맞으면 감정서 주소를 돌려준다.
// 주문번호만으로는 열 수 없게 연락처를 함께 확인하고, 같은 기기(IP)에서 1시간에 20번까지만 시도할 수 있다.
import { getOrder } from "./orders";
import { normalizePhone } from "./sms";
import { getStore } from "./store";

export const LOOKUP_PER_HOUR = 20;

export type LookupResult = { ok: true; url: string } | { ok: false; status: number; error: string };

const NOT_FOUND = "주문번호와 연락처가 맞는 주문을 찾지 못했습니다. 주문할 때 적은 이메일이나 휴대폰 번호를 확인해 주세요.";

export async function lookupOrder(orderIdRaw: string, contactRaw: string, ip: string, now = new Date()): Promise<LookupResult> {
  const store = getStore();
  if (!store) return { ok: false, status: 503, error: "주문 조회를 잠시 쓸 수 없습니다. 고객센터로 문의해 주세요." };
  const hour = new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 13);
  if ((await store.incr(`lookup:${ip}:${hour}`, 3600)) > LOOKUP_PER_HOUR) {
    return { ok: false, status: 429, error: "조회를 너무 여러 번 시도했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
  const orderId = orderIdRaw.trim().toUpperCase().replace(/^CGR(\d)/, "CGR-$1");
  const contact = contactRaw.trim();
  if (!orderId || !contact) return { ok: false, status: 400, error: "주문번호와 이메일(또는 휴대폰 번호)을 적어 주세요." };
  // 주문번호 뒷부분은 소문자 16진수라 대문자로 바꾼 것을 되돌린다.
  const order = await getOrder(orderId.replace(/^(CGR-\d{8}-)([0-9A-F]+)$/, (_, a: string, b: string) => a + b.toLowerCase()));
  if (!order) return { ok: false, status: 404, error: NOT_FOUND };
  const phone = normalizePhone(contact);
  const matches =
    (phone && order.phone && phone === order.phone) || (order.email && contact.toLowerCase() === order.email.toLowerCase());
  if (!matches) return { ok: false, status: 404, error: NOT_FOUND };
  if (order.status === "cancelled") return { ok: false, status: 410, error: "결제가 취소된 주문입니다." };
  if (order.status !== "paid" || !order.token) return { ok: false, status: 409, error: "결제가 끝나지 않은 주문입니다." };
  // 선물 주문은 선물 링크 화면으로(받았으면 거기서 감정서로 이어진다).
  if (order.gift) return { ok: true, url: `/gift/${order.gift.code}?new=1` };
  return { ok: true, url: `/r/${order.token}` };
}
