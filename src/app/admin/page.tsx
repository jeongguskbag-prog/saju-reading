import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import AdminLogin from "@/components/AdminLogin";
import SiteShell from "@/components/SiteShell";
import { ADMIN_COOKIE, checkAdminSession, checkOwnerApp, isAdminEnabled, ORDER_COLUMNS, OWNER_APP_COOKIE, orderRow } from "@/lib/admin";
import OwnerAppRegister from "@/components/OwnerAppRegister";
import { listPaidOrders } from "@/lib/orders";
import { listReviews } from "@/lib/reviews";
import AdminReviewToggle from "@/components/AdminReviewToggle";
import { originFrom } from "@/lib/site";
import AdminResend from "@/components/AdminResend";
import AdminCancel from "@/components/AdminCancel";
import { FUNNEL_LABEL, FUNNEL_STEPS, funnelDays } from "@/lib/funnel";
import AdminCsvButton from "@/components/AdminCsvButton";
import AdminCoupons from "@/components/AdminCoupons";
import AdminRewrite from "@/components/AdminRewrite";
import { renderSignature } from "@/lib/orders";
import { usageDays } from "@/lib/ai-usage";
import { describeCoupon, listCoupons } from "@/lib/coupon";
import { PRODUCTS, sellableProducts } from "@/lib/product";
import { deliverySettings, lastSignatureFail, lastSmsFail, orderDeliveries, recentClientErrors } from "@/lib/delivery-status";

export const dynamic = "force-dynamic";

const kstTime = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};
export const metadata: Metadata = { title: "관리 — 주문 내역", robots: { index: false, follow: false } };

/** 관리 화면: 결제한 주문(주문번호·결제 정보·사주 입력·연락처)을 최근 순으로 본다. */
export default async function AdminPage() {
  // 관리 화면은 관리자용 앱(천기록 관리) 안에서만 연다. 웹 브라우저에는 없는 페이지처럼 보인다.
  // 앱에서 처음 들어오면 OwnerAppRegister가 앱 표시 쿠키를 받고 화면을 다시 연다.
  if (!checkOwnerApp((await cookies()).get(OWNER_APP_COOKIE)?.value)) {
    return (
      <SiteShell>
        <OwnerAppRegister reload />
        <section className="card">
          <h2>페이지를 찾을 수 없습니다</h2>
          <p className="muted">주소를 다시 확인해 주세요.</p>
          <a className="btn-secondary link-btn" href="/">
            홈으로
          </a>
        </section>
      </SiteShell>
    );
  }
  if (!isAdminEnabled()) {
    return (
      <SiteShell admin>
        <section className="card">
          <h2>관리 화면이 꺼져 있습니다</h2>
          <p className="muted">Vercel 환경 변수에 ADMIN_PASSWORD(8자 이상)를 넣으면 열립니다.</p>
        </section>
      </SiteShell>
    );
  }
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return (
      <SiteShell admin>
        <AdminLogin />
      </SiteShell>
    );
  }
  const origin = originFrom(await headers());
  const orders = await listPaidOrders(200);
  const rows = orders.map((o) => orderRow(o, origin));
  const total = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.amount, 0);
  const reviews = await listReviews({ limit: 100, includeHidden: true });
  const settings = deliverySettings();
  const deliveries = await orderDeliveries(orders.slice(0, 20)).catch(() => []);
  const sigFail = await lastSignatureFail().catch(() => null);
  const smsFail = await lastSmsFail().catch(() => null);
  const funnel = await funnelDays(14).catch(() => []);
  const sum = Object.fromEntries(FUNNEL_STEPS.map((st) => [st, funnel.reduce((a, d) => a + d.counts[st], 0)])) as Record<(typeof FUNNEL_STEPS)[number], number>;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "-");
  const clientErrors = await recentClientErrors().catch(() => []);
  const aiDays = await usageDays(7).catch(() => []);
  const aiSum = aiDays.reduce((a, d) => a + d.total, 0);
  const AI_KIND: Record<string, string> = { report: "감정서", rewrite: "다시 쓰기", consult: "AI 상담", free: "무료·앱 풀이", other: "기타" };
  const coupons = (await listCoupons().catch(() => [])).map((c) => ({
    code: c.code,
    label: describeCoupon(c),
    products: c.productIds?.length ? c.productIds.map((id) => PRODUCTS[id]?.name ?? id).join(", ") : "모든 감정서",
    expires: c.expiresAt ? kstTime(c.expiresAt).split(" ")[0] + "까지" : "없음",
    uses: c.uses,
    maxUses: c.maxUses,
    note: c.note,
    disabled: c.disabled,
  }));
  return (
    <SiteShell admin="in">
      <section className="card admin-orders">
        <h2>방문·결제 흐름 (최근 14일)</h2>
        <p className="muted">
          같은 사람은 하루 한 번만 셉니다(사장님 앱 제외). 괄호는 바로 앞 단계 대비 남은 비율입니다. 14일 합계: 방문 {sum.visit} → 무료 사주 {sum.chart} ({pct(sum.chart, sum.visit)}) →
          감정서 고르기 {sum.choose} ({pct(sum.choose, sum.chart)}) → 결제창 {sum.checkout} ({pct(sum.checkout, sum.choose)}) → 결제 완료 {sum.paid} ({pct(sum.paid, sum.checkout)})
        </p>
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th>날짜</th>
                {FUNNEL_STEPS.map((st) => (
                  <th key={st}>{FUNNEL_LABEL[st]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funnel.map((d) => (
                <tr key={d.day}>
                  <td>{d.day.slice(5).replace("-", "/")}</td>
                  {FUNNEL_STEPS.map((st) => (
                    <td key={st}>{d.counts[st]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card admin-orders">
        <h2>AI 비용 (최근 7일, 추정 {aiSum.toLocaleString("ko-KR")}원)</h2>
        <p className="muted">
          AI가 쓴 글자 양(토큰)으로 계산한 추정치입니다. 실제 청구액은 Anthropic 콘솔에서 확인하세요. 단가는 AI_PRICE_USD(백만 토큰당 입력,출력 달러, 기본 4,20), 환율은
          AI_KRW_PER_USD(기본 1400)로 바꿀 수 있습니다.
        </p>
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>합계</th>
                <th>호출</th>
                <th>용도별</th>
              </tr>
            </thead>
            <tbody>
              {aiDays.map((d) => (
                <tr key={d.day}>
                  <td>{d.day}</td>
                  <td>{d.total.toLocaleString("ko-KR")}원</td>
                  <td>{d.calls}</td>
                  <td>
                    {Object.entries(d.byKind)
                      .map(([k, v]) => `${AI_KIND[k] ?? k} ${v.toLocaleString("ko-KR")}원`)
                      .join(" · ") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <AdminCoupons rows={coupons} products={sellableProducts().map((p) => ({ id: p.id, name: p.name }))} />
      {clientErrors.length > 0 && (
        <section className="card admin-orders">
          <h2>화면 오류 ({clientErrors.length}건)</h2>
          <p className="muted">손님 화면이 멈췄을 때 남은 기록입니다(최근 순).</p>
          <div className="admin-table-wrap">
            <table className="table admin-table">
              <thead>
                <tr><th>시각</th><th>주소</th><th>오류</th><th>기기</th></tr>
              </thead>
              <tbody>
                {clientErrors.map((e, i) => (
                  <tr key={i}>
                    <td>{kstTime(e.at)}</td>
                    <td>{e.path}</td>
                    <td>
                      {e.message}
                      {e.digest ? ` (${e.digest})` : ""}
                      <details><summary>자세히</summary><pre style={{ whiteSpace: "pre-wrap", fontSize: 11 }}>{e.stack}</pre></details>
                    </td>
                    <td><small>{e.ua}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="card admin-orders">
        <h2>파일 발송 점검</h2>
        <p className="muted">감정서 PDF·HTML이 메일·문자로 나가는 데 필요한 설정입니다(값은 보이지 않습니다).</p>
        <ul className="admin-checks">
          {settings.map((c) => (
            <li key={c.name}>
              <b className={c.ok ? "ok" : "no"}>{c.ok ? "✓" : "✗"}</b> {c.name} <small className="muted">{c.note}</small>
            </li>
          ))}
        </ul>
        {sigFail && (
          <p className="error">
            예약 발송 요청의 서명 확인 실패: {kstTime(sigFail.at)} ({sigFail.url})
          </p>
        )}
        {smsFail && (
          <p className="error">
            마지막 문자·알림톡 발송 실패: {kstTime(smsFail.at)} · {smsFail.detail}
          </p>
        )}
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th>결제일시</th><th>주문번호</th><th>성함</th><th>이메일</th><th>결제 확인</th><th>공개·발송 시각</th><th>발송 예약</th><th>파일 발송</th><th>마지막 시도</th><th>AI 비용(추정)</th><th>점검</th><th></th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.orderId}>
                  <td>{kstTime(d.paidAt)}</td>
                  <td>{d.orderId}</td>
                  <td>{d.name}</td>
                  <td>{d.email || "(이메일 안 받음)"}</td>
                  <td>{d.receipt ? `보냄 ${kstTime(d.receipt)}` : "안 보냄"}</td>
                  <td>
                    {d.cancelled
                      ? "결제 취소됨"
                      : d.kind === "gift"
                        ? d.redeemed
                          ? "선물 받음"
                          : "선물 링크 대기"
                        : d.released
                          ? `공개됨 (${kstTime(d.releaseAt!)})`
                          : `${kstTime(d.releaseAt!)} 예정`}
                    {d.kind === "giftReport" ? " · 선물" : ""}
                  </td>
                  <td>{d.schedule ? d.schedule.note : d.deliverAt ? `예약 ${kstTime(d.deliverAt)}` : "기록 없음"}</td>
                  <td>{d.mailed ? `보냄 ${kstTime(d.mailed)}` : "안 보냄"}</td>
                  <td>{d.log ? `${kstTime(d.log.at)} · 파일 ${d.log.files} · 메일 ${d.log.mail} · 휴대폰 ${d.log.phone}` : "시도 기록 없음"}</td>
                  <td>{d.ai ? `${d.ai.krw.toLocaleString("ko-KR")}원 (${d.ai.calls}회)` : "-"}</td>
                  <td>
                    {!d.cancelled && d.kind !== "gift" && d.token && (
                      <>
                        <a href={`/r/${d.token}?render=${renderSignature(d.token)}`} target="_blank" rel="noopener noreferrer">
                          {d.released ? "감정서 보기" : "공개 전 미리 보기"}
                        </a>
                        {!d.released && <AdminRewrite orderId={d.orderId} name={d.name} />}
                      </>
                    )}
                  </td>
                  <td>
                    {!d.cancelled && d.kind !== "gift" && <AdminResend orderId={d.orderId} name={d.name} held={!d.released} />}
                    {!d.cancelled && d.kind !== "giftReport" && !(d.kind === "gift" && d.redeemed) && (
                      <AdminCancel orderId={d.orderId} name={d.name} released={d.kind === "gift" ? false : d.released} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card admin-orders">
        <h2>결제한 주문 ({rows.length}건, {total.toLocaleString("ko-KR")}원)</h2>
        <p className="muted">최근 200건입니다. 전체는 엑셀(CSV)로 내려받으세요.</p>
        <p>
          <AdminCsvButton />
        </p>
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>{ORDER_COLUMNS.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.주문번호}>
                  {ORDER_COLUMNS.map((c) => (
                    <td key={c}>{c === "감정서 주소" && r[c] ? <a href={r[c]} target="_blank" rel="noopener">열기</a> : r[c]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card admin-orders">
        <h2>의뢰인 후기 ({reviews.length}건)</h2>
        <p className="muted">첫 화면에는 숨기지 않은 후기가 최신 순으로 실립니다. 욕설·개인정보·광고처럼 싣기 어려운 후기만 숨기세요.</p>
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr><th>작성일</th><th>주문번호</th><th>이름</th><th>별점</th><th>상품</th><th>후기</th><th>공개</th></tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.orderId}>
                  <td>{r.createdAt.slice(0, 10)}</td>
                  <td>{r.orderId}</td>
                  <td>{r.name}</td>
                  <td>{"★".repeat(r.rating)}</td>
                  <td>{r.product}</td>
                  <td style={{ whiteSpace: "pre-line", minWidth: 260 }}>{r.text}</td>
                  <td><AdminReviewToggle orderId={r.orderId} hidden={Boolean(r.hidden)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SiteShell>
  );
}
