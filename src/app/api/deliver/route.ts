// QStash가 예약 시각(신청 10분 뒤)에 부르는 곳: 감정서를 마저 쓰고 PDF·HTML을 만들어 보낸다.
// 실패하면 500을 돌려 QStash가 다시 부르게 한다. 같은 주문은 한 번만 보낸다.
import { completeReport } from "@/lib/fulfill";
import { deliverReport, verifyQstash } from "@/lib/delivery";
import { getReport } from "@/lib/orders";
import { originFrom } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = await request.text();
  const origin = originFrom(request.headers);
  const ok = await verifyQstash(request.headers.get("upstash-signature"), body, `${origin}/api/deliver`);
  if (!ok) return Response.json({ error: "서명이 맞지 않습니다." }, { status: 401 });
  let token: unknown;
  try {
    token = (JSON.parse(body) as { token?: unknown }).token;
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (typeof token !== "string") return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  let report = await getReport(token);
  // 없는 주문·지난 주문은 다시 부를 필요가 없다.
  if (!report || report.expired) return Response.json({ status: "skipped" });

  // 아직 덜 쓴 파트가 있으면 마저 쓴다(파일 만들 시간을 남겨 둔다).
  const outcome0 = await deliverReport(report, origin);
  if (outcome0 !== "incomplete") return result(outcome0);
  await completeReport(token, origin, 170_000);
  report = await getReport(token);
  if (!report) return Response.json({ status: "skipped" });
  return result(await deliverReport(report, origin));
}

function result(outcome: string) {
  if (outcome === "sent" || outcome === "already" || outcome === "none" || outcome === "saved") return Response.json({ status: outcome });
  return Response.json({ status: outcome }, { status: 500 });
}
