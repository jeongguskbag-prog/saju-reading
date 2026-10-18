import { clientIp } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/** 화면 오류 기록(관리 화면에서 본다). 최근 50건, 한 기기에서 1시간에 20건까지. */
export async function POST(request: Request) {
  const store = getStore();
  if (!store) return new Response(null, { status: 204 });
  const hour = new Date().toISOString().slice(0, 13);
  if ((await store.incr(`client-error-rate:${clientIp(request.headers)}:${hour}`, 3600)) > 20) return new Response(null, { status: 204 });
  const body = (await request.json().catch(() => null)) as { message?: unknown; stack?: unknown; path?: unknown; digest?: unknown } | null;
  const entry = {
    at: new Date().toISOString(),
    path: String(body?.path ?? "").slice(0, 200),
    message: String(body?.message ?? "").slice(0, 500),
    digest: String(body?.digest ?? "").slice(0, 100),
    stack: String(body?.stack ?? "").slice(0, 1500),
    ua: (request.headers.get("user-agent") ?? "").slice(0, 200),
  };
  console.error("화면 오류", entry);
  await store.listPush("client-errors", JSON.stringify(entry));
  return new Response(null, { status: 204 });
}
