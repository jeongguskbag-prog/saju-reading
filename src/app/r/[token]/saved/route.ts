import { getReport, markSaved } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** 손님이 화면에서 HTML 문서를 저장했다고 적는다(관리용 기록). */
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const report = await getReport((await params).token);
  if (report && !report.expired) await markSaved(report.order.id, "html").catch(() => {});
  return new Response(null, { status: 204 });
}
