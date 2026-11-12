// 토스페이먼츠 결제창 열기(브라우저 전용).
// - API 개별 연동 키(test_ck_ / live_ck_): 토스 결제창을 바로 연다.
// - 결제위젯 연동 키(test_gck_ / live_gck_): 화면 위에 결제 수단·약관 위젯을 띄우고, '결제하기'를 누르면 결제한다.
// 어느 키든 결제가 끝나면 같은 /pay/success 로 돌아오고, 서버의 승인(confirm) 과정도 같다.

interface TossWidgets {
  setAmount(a: { currency: "KRW"; value: number }): Promise<void>;
  renderPaymentMethods(o: { selector: string; variantKey?: string }): Promise<unknown>;
  renderAgreement(o: { selector: string; variantKey?: string }): Promise<unknown>;
  requestPayment(o: Record<string, unknown>): Promise<void>;
}

interface TossPaymentsInstance {
  payment(opts: { customerKey: string }): { requestPayment(opts: Record<string, unknown>): Promise<void> };
  widgets(opts: { customerKey: string }): TossWidgets;
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

const SDK_URL = "https://js.tosspayments.com/v2/standard";

export function loadSdk(): Promise<NonNullable<Window["TossPayments"]>> {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.onload = () => (window.TossPayments ? resolve(window.TossPayments) : reject(new Error("결제 모듈을 불러오지 못했습니다.")));
    s.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요."));
    document.head.appendChild(s);
  });
}

/** 결제위젯 연동 키인지(test_gck_… / live_gck_…) */
export const isWidgetKey = (clientKey: string) => /^(test|live)_gck_/.test(clientKey);

export interface TossOrder {
  clientKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
  customerName?: string;
  customerEmail?: string;
  customerMobilePhone?: string;
}

const cancelError = () => Object.assign(new Error("결제를 취소했습니다."), { code: "USER_CANCEL" });

/** 주문으로 토스 결제를 연다. 성공하면 /pay/success 로 넘어가므로 돌아오지 않는다. */
export async function requestTossPayment(order: TossOrder, method: "CARD" | "MOBILE_PHONE" = "CARD"): Promise<void> {
  const TossPayments = await loadSdk();
  const toss = TossPayments(order.clientKey);
  const common = {
    orderId: order.orderId,
    orderName: order.orderName,
    successUrl: `${location.origin}/pay/success`,
    failUrl: `${location.origin}/pay/fail`,
    ...(order.customerEmail ? { customerEmail: order.customerEmail } : {}),
    ...(order.customerMobilePhone ? { customerMobilePhone: order.customerMobilePhone } : {}),
    ...(order.customerName ? { customerName: order.customerName } : {}),
  };
  if (!isWidgetKey(order.clientKey)) {
    await toss.payment({ customerKey: order.customerKey }).requestPayment({ method, amount: { currency: "KRW", value: order.amount }, ...common });
    return;
  }
  await widgetCheckout(toss, order, common);
}

/** 결제위젯: 화면 위 창에 결제 수단·약관을 그리고, '결제하기'로 결제한다. 닫으면 USER_CANCEL. */
function widgetCheckout(toss: TossPaymentsInstance, order: TossOrder, common: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement("div");
    overlay.className = "toss-widget-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "결제");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;";
    overlay.innerHTML = `
      <div style="background:#fff;color:#191f28;width:100%;max-width:560px;max-height:92vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px 0 20px;box-sizing:border-box">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 20px 8px">
          <strong style="font-size:17px">${escapeHtml(order.orderName)}</strong>
          <button type="button" data-close aria-label="닫기" style="border:0;background:none;font-size:24px;line-height:1;cursor:pointer;color:#555">×</button>
        </div>
        <div id="toss-widget-methods"></div>
        <div id="toss-widget-agreement"></div>
        <div style="padding:0 20px">
          <button type="button" data-pay disabled style="width:100%;padding:15px;border:0;border-radius:10px;background:#3182f6;color:#fff;font-size:17px;font-weight:700;cursor:pointer">
            ${order.amount.toLocaleString("ko-KR")}원 결제하기
          </button>
          <p data-msg style="color:#d22;font-size:14px;margin:8px 0 0;min-height:1em"></p>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = () => {
      overlay.remove();
      document.body.style.overflow = prevOverflow;
    };
    const payBtn = overlay.querySelector<HTMLButtonElement>("[data-pay]")!;
    const msg = overlay.querySelector<HTMLElement>("[data-msg]")!;
    overlay.querySelector("[data-close]")!.addEventListener("click", () => {
      close();
      reject(cancelError());
    });

    const widgets = toss.widgets({ customerKey: order.customerKey });
    (async () => {
      await widgets.setAmount({ currency: "KRW", value: order.amount });
      await Promise.all([
        widgets.renderPaymentMethods({ selector: "#toss-widget-methods", variantKey: "DEFAULT" }),
        widgets.renderAgreement({ selector: "#toss-widget-agreement", variantKey: "AGREEMENT" }),
      ]);
      payBtn.disabled = false;
    })().catch((err) => {
      close();
      reject(err);
    });

    payBtn.addEventListener("click", async () => {
      msg.textContent = "";
      payBtn.disabled = true;
      try {
        await widgets.requestPayment(common);
        close();
        resolve();
      } catch (err) {
        const code = (err as { code?: string }).code;
        // 결제창만 닫은 경우는 위젯을 그대로 두어 다시 고를 수 있게 한다.
        msg.textContent = code === "USER_CANCEL" || code === "PAY_PROCESS_CANCELED" ? "" : (err as Error).message;
        payBtn.disabled = false;
      }
    });
  });
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
