import { CLIENT_STEPS, trackStep, type FunnelStep } from "@/lib/funnel";
import { clientIp } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;

/** 화면 단계 기록: { step, vid }. 개인정보는 받지 않는다. */
export async function POST(request: Request) {
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  const store = getStore();
  const hour = new Date().toISOString().slice(0, 13);
  if (store && (await store.incr(`track-rate:${clientIp(request.headers)}:${hour}`, 3600).catch(() => 0)) > 200) return new Response(null, { status: 204 });
  const body = (await request.json().catch(() => null)) as { step?: string; vid?: string } | null;
  const step = body?.step as FunnelStep;
  if (!CLIENT_STEPS.includes(step) || typeof body?.vid !== "string") return new Response(null, { status: 204 });
  await trackStep(step, body.vid);
  return new Response(null, { status: 204 });
}
