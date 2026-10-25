import { timingSafeEqual } from "node:crypto";
import { getMember, setMonthlyMail } from "@/lib/member";
import { unsubscribeSig } from "@/lib/monthly-mail";

export const dynamic = "force-dynamic";

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="robots" content="noindex"></head><body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;background:#f6f1e7;color:#2a2620;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px"><div style="background:#fff;border-radius:14px;padding:24px;max-width:420px;line-height:1.7"><h1 style="font-size:20px;margin:0 0 8px">${title}</h1><p style="margin:0 0 16px">${body}</p><a href="/" style="color:#b0262c">천기록으로 가기</a></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

async function handle(request: Request) {
  const u = new URL(request.url);
  const m = u.searchParams.get("m") ?? "";
  const s = u.searchParams.get("s") ?? "";
  const want = unsubscribeSig(m);
  if (!m || s.length !== want.length || !timingSafeEqual(Buffer.from(s), Buffer.from(want))) return page("링크를 확인해 주세요", "수신 거부 링크가 올바르지 않습니다. 마이에서 직접 끌 수도 있습니다.", 400);
  if (await getMember(m).catch(() => null)) await setMonthlyMail(m, null);
  return page("수신을 거부했습니다", "이달의 운세 메일을 더 이상 보내 드리지 않습니다. 받으신 이메일 주소도 지웠습니다. 다시 받으시려면 마이에서 언제든 켤 수 있습니다.");
}

/** 메일의 수신 거부 링크(GET)와 메일 앱의 원클릭 수신 거부(POST) */
export const GET = handle;
export const POST = handle;
