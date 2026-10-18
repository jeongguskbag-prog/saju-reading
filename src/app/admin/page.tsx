import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import AdminLogin from "@/components/AdminLogin";
import SiteShell from "@/components/SiteShell";
import { ADMIN_COOKIE, checkAdminSession, isAdminEnabled, ORDER_COLUMNS, orderRow } from "@/lib/admin";
import { listPaidOrders } from "@/lib/orders";
import { listReviews } from "@/lib/reviews";
import AdminReviewToggle from "@/components/AdminReviewToggle";
import { originFrom } from "@/lib/site";
import AdminResend from "@/components/AdminResend";
import AdminCsvButton from "@/components/AdminCsvButton";
import { deliverySettings, lastSignatureFail, orderDeliveries } from "@/lib/delivery-status";

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
  const total = orders.reduce((s, o) => s + o.amount, 0);
  const reviews = await listReviews({ limit: 100, includeHidden: true });
  const settings = deliverySettings();
  const deliveries = await orderDeliveries(orders.slice(0, 20)).catch(() => []);
  const sigFail = await lastSignatureFail().catch(() => null);
  return (
    <SiteShell admin="in">
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
        <div className="admin-table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th>결제일시</th><th>주문번호</th><th>성함</th><th>이메일</th><th>결제 확인</th><th>발송 예약</th><th>파일 발송</th><th>마지막 시도</th><th></th>
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
                  <td>{d.schedule ? d.schedule.note : d.deliverAt ? `예약 ${kstTime(d.deliverAt)}` : "기록 없음"}</td>
                  <td>{d.mailed ? `보냄 ${kstTime(d.mailed)}` : "안 보냄"}</td>
                  <td>{d.log ? `${kstTime(d.log.at)} · 파일 ${d.log.files} · 메일 ${d.log.mail} · 휴대폰 ${d.log.phone}` : "시도 기록 없음"}</td>
                  <td><AdminResend orderId={d.orderId} name={d.name} /></td>
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
