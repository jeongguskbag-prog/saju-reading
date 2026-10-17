import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import AdminLogin from "@/components/AdminLogin";
import SiteShell from "@/components/SiteShell";
import { ADMIN_COOKIE, checkAdminSession, isAdminEnabled, ORDER_COLUMNS, orderRow } from "@/lib/admin";
import { listPaidOrders } from "@/lib/orders";
import { originFrom } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "관리 — 주문 내역", robots: { index: false, follow: false } };

/** 관리 화면: 결제한 주문(주문번호·결제 정보·사주 입력·연락처)을 최근 순으로 본다. */
export default async function AdminPage() {
  if (!isAdminEnabled()) {
    return (
      <SiteShell>
        <section className="card">
          <h2>관리 화면이 꺼져 있습니다</h2>
          <p className="muted">Vercel 환경 변수에 ADMIN_PASSWORD(8자 이상)를 넣으면 열립니다.</p>
        </section>
      </SiteShell>
    );
  }
  if (!checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return (
      <SiteShell>
        <AdminLogin />
      </SiteShell>
    );
  }
  const origin = originFrom(await headers());
  const orders = await listPaidOrders(200);
  const rows = orders.map((o) => orderRow(o, origin));
  const total = orders.reduce((s, o) => s + o.amount, 0);
  return (
    <SiteShell>
      <section className="card admin-orders">
        <h2>결제한 주문 ({rows.length}건, {total.toLocaleString("ko-KR")}원)</h2>
        <p className="muted">최근 200건입니다. 전체는 엑셀(CSV)로 내려받으세요.</p>
        <p>
          <a className="btn-secondary link-btn" href="/api/admin/orders">엑셀(CSV)로 내려받기</a>
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
    </SiteShell>
  );
}
