import { cookies } from "next/headers";
import { ADMIN_COOKIE, checkAdminSession } from "@/lib/admin";
import { CANONICAL_ORIGIN } from "@/lib/canonical";
import { sendMonthlyMails } from "@/lib/monthly-mail";
import { originFrom } from "@/lib/site";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * 매월 1일 이달의 운세 메일 발송. Vercel Cron(vercel.json)이 부르며 CRON_SECRET으로 확인한다.
 * 관리 화면에 로그인한 브라우저에서도 부를 수 있다(지금 보내기). 이미 보낸 회원에게는 다시 보내지 않는다.
 */
export async function GET(request: Request) {
  const cron = process.env.CRON_SECRET;
  const byCron = Boolean(cron) && request.headers.get("authorization") === `Bearer ${cron}`;
  const byAdmin = checkAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!byCron && !byAdmin) return Response.json({ error: "권한이 없습니다." }, { status: 401 });
  const origin = process.env.VERCEL_ENV === "production" ? CANONICAL_ORIGIN : originFrom(request.headers);
  const run = await sendMonthlyMails(origin);
  return Response.json(run);
}
