import { lookupOrder } from "@/lib/lookup";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** 주문 조회: { orderId, contact } → { url } */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { orderId?: unknown; contact?: unknown } | null;
  const r = await lookupOrder(String(body?.orderId ?? ""), String(body?.contact ?? ""), clientIp(request.headers));
  return r.ok ? Response.json({ url: r.url }) : Response.json({ error: r.error }, { status: r.status });
}
