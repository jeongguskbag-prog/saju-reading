// 주문 → 결제 승인 → 리포트 토큰 발급(서버 전용).
import { randomBytes, randomUUID } from "node:crypto";
import { calculateSaju, type BirthInput, type SajuChart } from "./saju/calc";
import { DEFAULT_PRODUCT, PRODUCTS, REPORT_VALID_DAYS, SALES_OPEN, sellableProducts, type Product, type ProductId } from "./product";
import type { ReportPartKey as PartKey, PartResult } from "./report-shared";
import { getStore, requireStore } from "./store";
import type { NamingRequest } from "./naming/engine";
import { isKakaoEnabled, isSmsEnabled, normalizePhone, type PhoneChannel } from "./sms";
export { phoneChannels, type PhoneChannel } from "./sms";
import { isAiEnabled } from "./reading";

export interface Order {
  id: string;
  /** 토스 결제창에 넘기는 구매자 식별 값(무작위) */
  customerKey: string;
  input: BirthInput;
  email: string;
  /** 상품. 예전 주문(상품 구분 전)은 종합 감정서로 본다. */
  productId?: ProductId;
  amount: number;
  orderName: string;
  status: "pending" | "paid";
  createdAt: string;
  paidAt?: string;
  paymentKey?: string;
  method?: string;
  /** 결제 후 발급하는 리포트 열람 토큰 */
  token?: string;
  /** 작명록 신청서(작명록 주문만) */
  naming?: NamingRequest;
  /** 감정서 링크를 문자로 받을 휴대폰 번호(숫자만). 있으면 완성 때 문자를 보낸다. */
  phone?: string;
  /** 휴대폰으로 받는 곳(카카오톡 알림톡·문자, 둘 다 가능) */
  channels?: PhoneChannel[];
  /** 예전 주문: 휴대폰으로 받는 방법 하나 */
  channel?: PhoneChannel;
  /** 파일(PDF·HTML)을 보내기로 예약한 시각(ISO). 있으면 완성되어도 바로 보내지 않고 이때 보낸다. */
  deliverAt?: string;
}

export class OrderError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const PENDING_TTL = 60 * 60 * 48; // 결제하지 않은 주문은 이틀 뒤 지운다.
const orderKey = (id: string) => `order:${id}`;
const reportKey = (token: string) => `report:${token}`;
const partKey = (token: string, part: PartKey) => `report:${token}:part:${part}`;
const lockKey = (token: string, part: PartKey) => `lock:${token}:${part}`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return email.length <= 100 && EMAIL_RE.test(email);
}

/** 토스 결제창·승인 키와 저장소, AI 키가 모두 있어야 결제를 연다. */
export function checkoutConfig(): { enabled: boolean; clientKey: string | null; testMode: boolean; mobilePhone: boolean; sms: boolean; kakao: boolean } {
  const clientKey = process.env.TOSS_CLIENT_KEY || null;
  const secret = process.env.TOSS_SECRET_KEY;
  const testKey = Boolean(clientKey?.startsWith("test_"));
  // 테스트 키여도 결제 화면을 연다(화면에 "테스트 결제 모드" 안내가 나온다). 돈이 나가지 않는 결제로 감정서를
  // 받아 갈 수 있으므로, 실제 사이트에서 테스트 결제를 막으려면 Vercel에 BLOCK_TEST_PAYMENTS=1을 넣는다.
  // live_ 키로 바꾸면 실제 결제가 된다.
  const testBlocked = testKey && process.env.VERCEL_ENV === "production" && process.env.BLOCK_TEST_PAYMENTS === "1";
  const enabled = SALES_OPEN && !testBlocked && Boolean(clientKey && secret && getStore() && isAiEnabled());
  return {
    enabled,
    clientKey: enabled ? clientKey : null,
    testMode: testKey,
    // 휴대폰 결제는 토스페이먼츠와 별도 계약이 필요해, 계약 후 TOSS_MOBILE_PHONE=1로 켠다.
    mobilePhone: enabled && process.env.TOSS_MOBILE_PHONE === "1",
    // 감정서 링크를 문자로 받기(솔라피 키·발신번호가 있을 때)
    sms: enabled && isSmsEnabled(),
    // 감정서 링크를 카카오톡 알림톡으로 받기(솔라피 + 카카오 채널·템플릿)
    kakao: enabled && isKakaoEnabled(),
  };
}

export const productOf = (order: Pick<Order, "productId">): Product => PRODUCTS[order.productId ?? DEFAULT_PRODUCT] ?? PRODUCTS[DEFAULT_PRODUCT];

export async function createOrder(
  input: BirthInput,
  email: string,
  productId: ProductId = DEFAULT_PRODUCT,
  now = new Date(),
  naming?: NamingRequest,
  phone?: string,
  channels: PhoneChannel[] = phone ? ["sms"] : [],
): Promise<Order> {
  const product = sellableProducts().find((p) => p.id === productId);
  if (!product) throw new OrderError("지금은 신청할 수 없는 상품입니다.");
  if (!input.name?.trim()) throw new OrderError("감정서에 들어갈 성함을 적어 주세요.");
  // 받는 곳(선택): 이메일·카카오톡·문자 가운데 고른 곳 모두로 보낸다. 웹 신청서는 받는 곳 없이 화면에서 바로 저장한다.
  const picked = [...new Set(channels)].filter((c): c is PhoneChannel => c === "kakao" || c === "sms");
  const mobile = phone ? normalizePhone(phone) : null;
  if (picked.length && !phone) throw new OrderError("카카오톡·문자로 받을 휴대폰 번호를 적어 주세요.");
  if (phone && !mobile) throw new OrderError("휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)");
  if (mobile && !picked.length) throw new OrderError("휴대폰으로 받을 곳(카카오톡 또는 문자)을 골라 주세요.");
  if (picked.includes("sms") && !isSmsEnabled()) throw new OrderError("지금은 문자로 받을 수 없습니다. 다른 곳으로 받아 주세요.");
  if (picked.includes("kakao") && !isKakaoEnabled()) throw new OrderError("지금은 카카오톡으로 받을 수 없습니다. 다른 곳으로 받아 주세요.");
  if (email && !isValidEmail(email)) throw new OrderError("이메일 주소를 확인해 주세요.");
  const chart = calculateSaju(input, now); // 입력 오류(InputError)는 호출한 쪽에서 메시지로 돌려준다.
  if (product.parts.includes("naming")) {
    if (!naming) throw new OrderError("작명 신청 내용을 적어 주세요.");
    // 결제 전에 이름 후보를 실제로 뽑아 보아, 조건이 맞지 않는 신청은 결제 전에 알려 준다.
    const { computeNaming, NamingError } = await import("./naming/engine");
    try {
      computeNaming(chart, naming);
    } catch (error) {
      if (error instanceof NamingError) throw new OrderError(error.message);
      throw error;
    }
  }
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const order: Order = {
    id: `CGR-${ymd}-${randomBytes(8).toString("hex")}`,
    customerKey: randomUUID(),
    input,
    email,
    productId: product.id,
    amount: product.price,
    orderName: product.name,
    ...(product.parts.includes("naming") && naming ? { naming } : {}),
    ...(mobile ? { phone: mobile, channels: picked } : {}),
    status: "pending",
    createdAt: now.toISOString(),
  };
  await requireStore().set(orderKey(order.id), order, PENDING_TTL);
  return order;
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!/^[A-Za-z0-9_=-]{6,64}$/.test(id)) return null;
  return requireStore().get<Order>(orderKey(id));
}

interface TossPayment {
  orderId: string;
  status: string;
  totalAmount: number;
  method?: string;
  approvedAt?: string;
}

async function tossConfirm(paymentKey: string, orderId: string, amount: number): Promise<TossPayment> {
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new OrderError("결제 설정이 없습니다.", 503);
  const base = (process.env.TOSS_API_BASE || "https://api.tosspayments.com").replace(/\/$/, "");
  const res = await fetch(`${base}/v1/payments/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Content-Type": "application/json",
      // 같은 주문을 두 번 승인 요청해도 한 번만 처리되도록.
      "Idempotency-Key": `confirm-${orderId}`,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as TossPayment & { code?: string; message?: string };
  if (!res.ok) throw new OrderError(data.message || "결제 승인에 실패했습니다.", res.status >= 500 ? 502 : 400);
  return data;
}

/**
 * 결제창에서 돌아온 값으로 결제를 승인하고 리포트 토큰을 발급한다.
 * 새로고침 등으로 다시 불려도 이미 승인된 주문이면 같은 토큰을 돌려준다.
 */
export async function confirmOrder(
  params: { paymentKey: string; orderId: string; amount: number },
  now = new Date(),
): Promise<{ order: Order; justPaid: boolean }> {
  const store = requireStore();
  const order = await getOrder(params.orderId);
  if (!order) throw new OrderError("주문을 찾을 수 없습니다. 결제 시간이 오래 지났다면 다시 주문해 주세요.", 404);
  if (order.status === "paid") {
    if (order.paymentKey !== params.paymentKey) throw new OrderError("이미 결제가 끝난 주문입니다.", 409);
    return { order, justPaid: false };
  }
  // 결제창을 거치며 금액이 바뀌지 않았는지 서버에 저장한 금액과 비교한다.
  if (params.amount !== order.amount) throw new OrderError("결제 금액이 주문 금액과 다릅니다.");

  const payment = await tossConfirm(params.paymentKey, order.id, order.amount);
  if (payment.status !== "DONE" || payment.totalAmount !== order.amount || payment.orderId !== order.id) {
    throw new OrderError("결제 승인 결과가 주문과 맞지 않습니다. 고객센터로 문의해 주세요.", 502);
  }
  const paid: Order = {
    ...order,
    status: "paid",
    paidAt: payment.approvedAt ? new Date(payment.approvedAt).toISOString() : now.toISOString(),
    paymentKey: params.paymentKey,
    method: payment.method,
    token: randomBytes(24).toString("base64url"),
  };
  await store.set(orderKey(order.id), paid);
  await store.set(reportKey(paid.token!), order.id);
  return { order: paid, justPaid: true };
}

export interface Report {
  order: Order;
  product: Product;
  chart: SajuChart;
  /** 열람 마감 시각(ISO) */
  expiresAt: string;
  expired: boolean;
}

const DAY = 86_400_000;

/**
 * 결제한 리포트. 감정 연도가 바뀌지 않도록 결제 시점 기준으로 명식을 계산한다.
 * 결제 후 REPORT_VALID_DAYS일이 지나면 expired로 돌려준다(풀이는 열지 않는다).
 */
export async function getReport(token: string, now = new Date()): Promise<Report | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const store = requireStore();
  const orderId = await store.get<string>(reportKey(token));
  if (!orderId) return null;
  const order = await getOrder(orderId);
  if (!order || order.status !== "paid" || order.token !== token) return null;
  const paidAt = new Date(order.paidAt ?? order.createdAt);
  const expiresAt = new Date(paidAt.getTime() + REPORT_VALID_DAYS * DAY);
  return {
    order,
    product: productOf(order),
    chart: calculateSaju(order.input, paidAt),
    expiresAt: expiresAt.toISOString(),
    expired: now.getTime() > expiresAt.getTime(),
  };
}

export async function getSavedPart(token: string, part: PartKey): Promise<PartResult | null> {
  return requireStore().get<PartResult>(partKey(token, part));
}

export async function getSavedParts(token: string, parts: readonly PartKey[]): Promise<Partial<Record<PartKey, PartResult>>> {
  const out: Partial<Record<PartKey, PartResult>> = {};
  await Promise.all(
    parts.map(async (p) => {
      const r = await getSavedPart(token, p);
      if (r) out[p] = r;
    }),
  );
  return out;
}

/** 풀이는 열람 기간이 끝나고 하루 뒤 저장소에서 지운다. */
export async function savePart(token: string, part: PartKey, result: PartResult, expiresAt?: string, now = new Date()): Promise<void> {
  const ttl = expiresAt ? Math.max(3600, Math.ceil((new Date(expiresAt).getTime() + DAY - now.getTime()) / 1000)) : undefined;
  await requireStore().set(partKey(token, part), result, ttl);
}

/** 발송 예약 시각을 적거나(null이면) 지운다. */
export async function setDeliverAt(orderId: string, deliverAt: string | null): Promise<void> {
  const store = requireStore();
  const order = await getOrder(orderId);
  if (!order) return;
  const { deliverAt: _old, ...rest } = order;
  void _old;
  await store.set(orderKey(orderId), deliverAt ? { ...rest, deliverAt } : rest);
}

/** 완성 메일을 한 번만 보내기 위한 표시. 처음 표시하면 true. */
export async function markMailed(orderId: string): Promise<boolean> {
  return requireStore().setIfAbsent(`mailed:${orderId}`, new Date().toISOString());
}

export async function unmarkMailed(orderId: string): Promise<void> {
  await requireStore().del(`mailed:${orderId}`);
}

/** 같은 파트를 두 곳에서 동시에 쓰지 않도록 5분짜리 잠금. 잠금을 얻으면 true. */
export async function lockPart(token: string, part: PartKey): Promise<boolean> {
  return requireStore().setIfAbsent(lockKey(token, part), 1, 300);
}

export async function unlockPart(token: string, part: PartKey): Promise<void> {
  await requireStore().del(lockKey(token, part));
}
