// 주문 → 결제 승인 → 리포트 토큰 발급(서버 전용).
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { computeReleaseAt, isReleased, orderReleaseAt, releaseMinutes } from "./release";
import { calculateSaju, InputError, type BirthInput, type SajuChart } from "./saju/calc";
import { DEFAULT_PRODUCT, PRODUCTS, REPORT_VALID_DAYS, SALES_OPEN, sellableProducts, type Product, type ProductId } from "./product";
import type { ReportPartKey as PartKey, PartResult } from "./report-shared";
import { getStore, requireStore } from "./store";
import type { NamingRequest } from "./naming/engine";
import { isExtraKind, type ExtraKind } from "./extras/kinds";
import { isKakaoEnabled, isSmsEnabled, normalizePhone, type PhoneChannel } from "./sms";
export { phoneChannels, type PhoneChannel } from "./sms";

/** 주문번호·결제 내역을 받을 곳 */
export type NotifyTarget = "email" | "kakao" | "sms";
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
  status: "pending" | "paid" | "cancelled";
  /** 결제 취소 시각·사유(관리자가 취소한 주문) */
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  paidAt?: string;
  paymentKey?: string;
  method?: string;
  /** 결제 후 발급하는 리포트 열람 토큰 */
  token?: string;
  /** 작명록 신청서(작명록 주문만) */
  naming?: NamingRequest;
  /** 추가 상품 신청서(궁합의 상대 생년월일시 등) */
  extra?: { kind: ExtraKind; request: unknown };
  /** 감정서 링크를 문자로 받을 휴대폰 번호(숫자만). 있으면 완성 때 문자를 보낸다. */
  phone?: string;
  /** 주문번호·결제 내역을 받을 곳(손님이 고른 곳 모두로 보낸다) */
  notify?: NotifyTarget[];
  /** 휴대폰으로 받는 곳(카카오톡 알림톡·문자, 둘 다 가능) */
  channels?: PhoneChannel[];
  /** 토스 카드 영수증 주소 */
  receiptUrl?: string;
  /** 결제 상세(토스 승인 응답에서 필요한 것만: 카드사·가린 카드번호·할부·승인번호, 간편결제) */
  payment?: {
    card?: { company?: string; number?: string; installmentPlanMonths?: number; approveNo?: string };
    easyPay?: string;
    approvedAt?: string;
  };
  /** 예전 주문: 휴대폰으로 받는 방법 하나 */
  channel?: PhoneChannel;
  /** 파일(PDF·HTML)을 보내기로 예약한 시각(ISO). 있으면 완성되어도 바로 보내지 않고 이때 보낸다. */
  deliverAt?: string;
  /** 감정서 본문을 화면에 열고 메일·문자로 보내는 시각(ISO). 결제할 때 상품별 대기 시간으로 정한다. */
  releaseAt?: string;
  /** 회원 보관함에 든 주문이면 회원번호. 보관함의 감정서는 열람 기간 없이 계속 열 수 있다. */
  memberId?: string;
  /** AI 상담 질문권 주문(감정서가 아니다). 결제하면 회원에게 질문권을 넣어 준다. */
  questionPack?: { id: string; count: number };
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

/** 결제한 주문번호 목록(최근 것이 앞) */
export const PAID_INDEX = "orders:paid";

/** 최근 결제한 주문들 */
export async function listPaidOrders(limit = 200, offset = 0): Promise<Order[]> {
  const store = requireStore();
  const ids = await store.listRange(PAID_INDEX, offset, offset + limit - 1);
  const orders = await Promise.all(ids.map((id) => getOrder(id)));
  return orders.filter((o): o is Order => Boolean(o));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return email.length <= 100 && EMAIL_RE.test(email);
}

/** 토스 결제창·승인 키와 저장소, AI 키가 모두 있어야 결제를 연다. */
export function checkoutConfig(): {
  enabled: boolean;
  clientKey: string | null;
  testMode: boolean;
  mobilePhone: boolean;
  sms: boolean;
  kakao: boolean;
  release: Record<ProductId, number>;
} {
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
    // 상품별 공개(발송)까지 대기 시간(분). 화면 안내에 쓴다.
    release: Object.fromEntries(Object.keys(PRODUCTS).map((id) => [id, releaseMinutes(id as ProductId)])) as Record<ProductId, number>,
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
  targets: NotifyTarget[] = [...(email ? (["email"] as const) : []), ...(phone ? (["sms"] as const) : [])],
  extraRequest?: unknown,
  memberId?: string,
): Promise<Order> {
  const product = sellableProducts().find((p) => p.id === productId);
  if (!product) throw new OrderError("지금은 신청할 수 없는 상품입니다.");
  if (!input.name?.trim()) throw new OrderError("감정서에 들어갈 성함을 적어 주세요.");
  // 연락처: 이메일·휴대폰 번호를 받고, 주문번호·결제 내역을 받을 곳(이메일·카카오톡·문자)을 고른 곳 모두로 보낸다.
  // 연락처는 주문 조회(주문번호 + 연락처)에도 쓴다.
  const notify = [...new Set(targets)].filter((t): t is NotifyTarget => t === "email" || t === "kakao" || t === "sms");
  const picked = notify.filter((t): t is PhoneChannel => t !== "email");
  const mobile = phone ? normalizePhone(phone) : null;
  if (!notify.length) throw new OrderError("주문번호와 결제 내역을 받을 곳(이메일·카카오톡·문자)을 하나 이상 골라 주세요.");
  if (phone && !mobile) throw new OrderError("휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)");
  if (picked.length && !mobile) throw new OrderError("카카오톡·문자로 받을 휴대폰 번호를 적어 주세요.");
  if (email && !isValidEmail(email)) throw new OrderError("이메일 주소를 확인해 주세요.");
  if (notify.includes("email") && !email) throw new OrderError("이메일로 받을 이메일 주소를 적어 주세요.");
  if (picked.includes("sms") && !isSmsEnabled()) throw new OrderError("지금은 문자로 받을 수 없습니다. 다른 곳으로 받아 주세요.");
  if (picked.includes("kakao") && !isKakaoEnabled()) throw new OrderError("지금은 카카오톡으로 받을 수 없습니다. 다른 곳으로 받아 주세요.");
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
  let extra: Order["extra"];
  if (isExtraKind(product.id)) {
    const { parseExtraRequest } = await import("./extras/requests");
    const parsedExtra = parseExtraRequest(product.id, extraRequest);
    if (!parsedExtra.ok) throw new OrderError(parsedExtra.error);
    const { checkExtra, ExtraError } = await import("./extras/generate");
    try {
      await checkExtra(chart, product.id, parsedExtra.value, now);
    } catch (error) {
      if (error instanceof ExtraError) throw new OrderError(error.message);
      if (error instanceof InputError) throw new OrderError(`상대 분의 생년월일시를 확인해 주세요. (${error.message})`);
      throw error;
    }
    extra = { kind: product.id, request: parsedExtra.value };
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
    ...(extra ? { extra } : {}),
    notify,
    ...(mobile ? { phone: mobile, channels: picked } : {}),
    status: "pending",
    createdAt: now.toISOString(),
    ...(memberId ? { memberId } : {}),
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
  receipt?: { url?: string };
  /** 카드사·간편결제 등 결제 상세(관리용으로 남긴다) */
  card?: { company?: string; issuerCode?: string; number?: string; installmentPlanMonths?: number; approveNo?: string };
  easyPay?: { provider?: string };
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
    ...(payment.receipt?.url ? { receiptUrl: payment.receipt.url } : {}),
    payment: {
      ...(payment.card
        ? { card: { company: payment.card.company ?? payment.card.issuerCode, number: payment.card.number, installmentPlanMonths: payment.card.installmentPlanMonths, approveNo: payment.card.approveNo } }
        : {}),
      ...(payment.easyPay?.provider ? { easyPay: payment.easyPay.provider } : {}),
      approvedAt: payment.approvedAt,
    },
    token: randomBytes(24).toString("base64url"),
  };
  if (!paid.questionPack) paid.releaseAt = computeReleaseAt(productOf(paid).id, new Date(paid.paidAt!)).toISOString();
  await store.set(orderKey(order.id), paid);
  await store.set(reportKey(paid.token!), order.id);
  // 결제한 주문 목록(관리 화면·내보내기). 주문 내용(결제 정보·사주 입력·연락처)은 order:주문번호에 그대로 남는다.
  await store.listPush(PAID_INDEX, order.id);
  // 로그인한 회원이 산 감정서는 그 회원의 보관함에 넣는다(회원 모듈이 주문 모듈을 쓰므로 여기서는 필요할 때 불러온다).
  if (paid.memberId && !paid.questionPack) {
    const { linkOrder } = await import("./member");
    await linkOrder(paid.memberId, paid.id).catch((error) => console.error("보관함에 넣지 못했습니다", error));
  }
  return { order: paid, justPaid: true };
}

export { isReleased, orderReleaseAt };

/** 공개 시각을 바꾼다(관리자 '지금 보내기'). */
export async function setReleaseAt(orderId: string, at: Date): Promise<Order | null> {
  const order = await getOrder(orderId);
  if (!order) return null;
  const next: Order = { ...order, releaseAt: at.toISOString() };
  await requireStore().set(orderKey(orderId), next);
  return next;
}

/**
 * 관리자 결제 취소: 토스에 전액 취소를 요청하고 주문을 '취소'로 바꾼다. 취소한 주문의 감정서는 열리지 않고 보내지 않는다.
 * 감정서 공개(발송) 전 취소 요청은 전액 환불한다(환불 규정).
 */
export async function cancelOrder(orderId: string, reason: string, now = new Date()): Promise<Order> {
  const order = await getOrder(orderId);
  if (!order) throw new OrderError("주문을 찾지 못했습니다.", 404);
  if (order.status === "cancelled") return order;
  if (order.status !== "paid" || !order.paymentKey) throw new OrderError("결제가 끝난 주문만 취소할 수 있습니다.");
  const secret = process.env.TOSS_SECRET_KEY;
  if (!secret) throw new OrderError("결제 설정이 없습니다.", 503);
  const base = (process.env.TOSS_API_BASE || "https://api.tosspayments.com").replace(/\/$/, "");
  const res = await fetch(`${base}/v1/payments/${encodeURIComponent(order.paymentKey)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `cancel-${order.id}`,
    },
    body: JSON.stringify({ cancelReason: reason.slice(0, 200) || "고객 요청" }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { status?: string; code?: string; message?: string };
  // 이미 취소된 결제(ALREADY_CANCELED_PAYMENT)는 우리 기록만 맞춘다.
  if (!res.ok && data.code !== "ALREADY_CANCELED_PAYMENT") throw new OrderError(data.message || "결제를 취소하지 못했습니다.", res.status >= 500 ? 502 : 400);
  const cancelled: Order = { ...order, status: "cancelled", cancelledAt: now.toISOString(), cancelReason: reason.slice(0, 200) };
  await requireStore().set(orderKey(order.id), cancelled);
  return cancelled;
}

/** PDF를 만드는 서버 브라우저만 공개 전 감정서를 열 수 있게 하는 서명 */
export function renderSignature(token: string): string {
  const secret = process.env.RENDER_SECRET || process.env.TOSS_SECRET_KEY || process.env.MEMBER_SESSION_SECRET || "local-render";
  return createHmac("sha256", secret).update(`render:${token}`).digest("base64url").slice(0, 32);
}

export interface Report {
  order: Order;
  product: Product;
  chart: SajuChart;
  /** 열람 마감 시각(ISO) */
  expiresAt: string;
  expired: boolean;
  /** 회원 보관함의 감정서: 열람 기간 없이 계속 열 수 있고 풀이도 지우지 않는다. */
  kept: boolean;
}

const DAY = 86_400_000;

/**
 * 결제한 리포트. 감정 연도가 바뀌지 않도록 결제 시점 기준으로 명식을 계산한다.
 * 결제 후 REPORT_VALID_DAYS일이 지나면 expired로 돌려준다(풀이는 열지 않는다). 회원 보관함의 감정서는 기간이 없다.
 */
export async function getReport(token: string, now = new Date()): Promise<Report | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const store = requireStore();
  const orderId = await store.get<string>(reportKey(token));
  if (!orderId) return null;
  const order = await getOrder(orderId);
  if (!order || order.status !== "paid" || order.token !== token) return null;
  // 질문권 주문에는 감정서가 없다.
  if (order.questionPack) return null;
  const paidAt = new Date(order.paidAt ?? order.createdAt);
  const expiresAt = new Date(paidAt.getTime() + REPORT_VALID_DAYS * DAY);
  return {
    order,
    product: productOf(order),
    chart: calculateSaju(order.input, paidAt),
    expiresAt: expiresAt.toISOString(),
    expired: !order.memberId && now.getTime() > expiresAt.getTime(),
    kept: Boolean(order.memberId),
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

/** 풀이는 열람 기간이 끝나고 하루 뒤 저장소에서 지운다. expiresAt이 없으면(회원 보관함) 지우지 않는다. */
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

/** 손님이 감정서 파일을 내려받았다고 적는다(파일 받기 주소가 파일을 내줄 때). */
export async function markSaved(orderId: string, ext: "pdf" | "html"): Promise<void> {
  await requireStore().set(`saved:${orderId}:${ext}`, new Date().toISOString(), 60 * 60 * 24 * 40);
}

/** 손님이 PDF·HTML 두 파일을 모두 내려받았는지 */
export async function savedBoth(orderId: string): Promise<boolean> {
  const store = requireStore();
  const [pdf, html] = await Promise.all([store.get(`saved:${orderId}:pdf`), store.get(`saved:${orderId}:html`)]);
  return Boolean(pdf && html);
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
