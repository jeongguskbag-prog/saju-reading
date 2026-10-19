// 감정서 선물하기(서버 전용).
// 1) 사는 분이 상품·받는 분 이름·메시지를 고르고 결제한다(선물 주문, 감정서 없음).
// 2) 결제가 끝나면 선물 링크(/gift/코드)가 생긴다. 사는 분이 카톡 등으로 직접 전한다(받는 분 번호로 따로 보내지 않는다).
// 3) 받는 분이 링크에서 생년월일시와 받을 곳을 넣으면, 그 정보로 감정서 주문(0원, 선물)이 만들어지고 평소처럼 미리보기 → 공개 시각에 발송된다.
import { randomBytes, randomUUID } from "node:crypto";
import { calculateSaju, type BirthInput } from "./saju/calc";
import { PRODUCTS, sellableProducts, type ProductId } from "./product";
import { getOrder, isValidEmail, OrderError, orderKey, PAID_INDEX, reportKey, type NotifyTarget, type Order } from "./orders";
import { computeReleaseAt } from "./release";
import { isKakaoEnabled, isSmsEnabled, normalizePhone, type PhoneChannel } from "./sms";
import { requireStore } from "./store";

/** 선물할 수 있는 상품(받는 분의 생년월일시만 있으면 되는 것) */
export const GIFT_PRODUCTS: ProductId[] = ["full", "core", "newyear"];
export const isGiftProduct = (id: unknown): id is ProductId =>
  typeof id === "string" && (GIFT_PRODUCTS as string[]).includes(id) && sellableProducts().some((p) => p.id === id);

const PENDING_TTL = 60 * 60 * 48;
const GIFT_CODE_RE = /^[A-Za-z0-9_-]{16,40}$/;
const clean = (s: unknown, max: number) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

function contactFields(email: string, phone: string | undefined, targets: NotifyTarget[]) {
  const notify = [...new Set(targets)].filter((t): t is NotifyTarget => t === "email" || t === "kakao" || t === "sms");
  const picked = notify.filter((t): t is PhoneChannel => t !== "email");
  const mobile = phone ? normalizePhone(phone) : null;
  if (!notify.length) throw new OrderError("받을 곳(이메일·카카오톡·문자)을 하나 이상 골라 주세요.");
  if (phone && !mobile) throw new OrderError("휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)");
  if (picked.length && !mobile) throw new OrderError("카카오톡·문자로 받을 휴대폰 번호를 적어 주세요.");
  if (email && !isValidEmail(email)) throw new OrderError("이메일 주소를 확인해 주세요.");
  if (notify.includes("email") && !email) throw new OrderError("이메일로 받을 이메일 주소를 적어 주세요.");
  if (picked.includes("sms") && !isSmsEnabled()) throw new OrderError("지금은 문자로 받을 수 없습니다. 다른 곳으로 받아 주세요.");
  if (picked.includes("kakao") && !isKakaoEnabled()) throw new OrderError("지금은 카카오톡으로 받을 수 없습니다. 다른 곳으로 받아 주세요.");
  return { notify, ...(mobile ? { phone: mobile, channels: picked } : {}) };
}

export interface GiftRequest {
  productId: unknown;
  from: unknown;
  to: unknown;
  message?: unknown;
  email: string;
  phone?: string;
  targets: NotifyTarget[];
  memberId?: string;
}

/** 선물 주문(결제 전). 결제 확인·선물 링크는 사는 분이 고른 곳으로 보낸다. */
export async function createGiftOrder(req: GiftRequest, now = new Date()): Promise<Order> {
  if (!isGiftProduct(req.productId)) throw new OrderError("선물할 수 없는 상품입니다.");
  const product = PRODUCTS[req.productId];
  const from = clean(req.from, 20);
  const to = clean(req.to, 20);
  const message = clean(req.message, 300);
  if (!from) throw new OrderError("보내는 분 이름을 적어 주세요.");
  if (!to) throw new OrderError("받는 분 이름을 적어 주세요.");
  const contact = contactFields(req.email, req.phone, req.targets);
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const order: Order = {
    id: `CGR-${ymd}-${randomBytes(8).toString("hex")}`,
    customerKey: randomUUID(),
    // 선물 주문에는 사주가 없다. 받는 분이 넣기 전까지 자리만 채운다(감정서를 만들지 않는다).
    input: { name: from, gender: "female", calendar: "solar", year: 2000, month: 1, day: 1, hour: null } as BirthInput,
    email: req.email,
    productId: product.id,
    amount: product.price,
    orderName: `${product.name} 선물`,
    ...contact,
    status: "pending",
    createdAt: now.toISOString(),
    ...(req.memberId ? { memberId: req.memberId } : {}),
    gift: { productId: product.id, from, to, ...(message ? { message } : {}), code: randomBytes(18).toString("base64url") },
  };
  await requireStore().set(orderKey(order.id), order, PENDING_TTL);
  return order;
}

/** 선물 링크의 선물 주문(결제가 끝나고 취소되지 않은 것만) */
export async function getGift(code: string): Promise<Order | null> {
  if (!GIFT_CODE_RE.test(code)) return null;
  const orderId = await requireStore().get<string>(`gift-code:${code}`);
  const order = orderId ? await getOrder(orderId) : null;
  if (!order?.gift || order.gift.code !== code || order.status !== "paid") return null;
  return order;
}

/**
 * 받는 분이 선물을 받는다: 받는 분의 생년월일시로 감정서 주문(0원, 선물)을 만들고 감정서 토큰을 준다.
 * 한 선물은 한 번만 받을 수 있다. 이미 받았으면 그 감정서를 돌려준다.
 */
export async function redeemGift(
  code: string,
  input: BirthInput,
  contact: { email: string; phone?: string; targets: NotifyTarget[] },
  now = new Date(),
): Promise<{ order: Order; created: boolean }> {
  const gift = await getGift(code);
  if (!gift?.gift) throw new OrderError("선물을 찾을 수 없습니다. 링크를 다시 확인해 주세요.", 404);
  if (gift.gift.redeemedOrderId) {
    const done = await getOrder(gift.gift.redeemedOrderId);
    if (done) return { order: done, created: false };
  }
  if (!input.name?.trim()) throw new OrderError("감정서에 들어갈 성함을 적어 주세요.");
  calculateSaju(input, now); // 입력 오류(InputError)는 부른 쪽에서 메시지로 돌려준다.
  const fields = contactFields(contact.email, contact.phone, contact.targets);
  const store = requireStore();
  // 같은 선물을 동시에 받거나, 받는 중에 결제가 취소되지 않도록 잠근다(관리자 취소도 같은 잠금을 쓴다).
  if (!(await store.setIfAbsent(`gift-redeem:${code}`, now.toISOString(), 600))) throw new OrderError("선물을 받는 중입니다. 잠시 뒤 새로고침해 주세요.", 409);
  const fresh = await getGift(code);
  if (!fresh?.gift || fresh.gift.redeemedOrderId) {
    await store.del(`gift-redeem:${code}`).catch(() => {});
    throw new OrderError("이미 받았거나 취소된 선물입니다. 링크를 새로고침해 주세요.", 409);
  }
  const product = PRODUCTS[gift.gift.productId];
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const order: Order = {
    id: `CGR-${ymd}-${randomBytes(8).toString("hex")}`,
    customerKey: randomUUID(),
    input,
    email: contact.email,
    productId: product.id,
    // 돈은 선물 주문에서 받았으므로 0원(매출이 두 번 잡히지 않게)
    amount: 0,
    orderName: product.name,
    ...fields,
    status: "paid",
    createdAt: now.toISOString(),
    paidAt: now.toISOString(),
    method: "선물",
    token: randomBytes(24).toString("base64url"),
    releaseAt: computeReleaseAt(product.id, now).toISOString(),
    giftOrderId: gift.id,
  };
  try {
    await store.set(orderKey(order.id), order);
    await store.set(reportKey(order.token!), order.id);
    await store.listPush(PAID_INDEX, order.id);
    await store.set(orderKey(fresh.id), { ...fresh, gift: { ...fresh.gift, redeemedOrderId: order.id, redeemedAt: now.toISOString() } });
  } catch (error) {
    // 저장이 중간에 실패하면 다시 받을 수 있게 잠금을 푼다.
    await store.del(`gift-redeem:${code}`).catch(() => {});
    throw error;
  }
  return { order, created: true };
}
