// 결제한 감정서를 끝까지 써서 저장하고, 다 쓰면 완성 메일을 한 번 보낸다(서버 전용).
// 손님이 결제 직후 창을 닫아도 결제 승인 단계에서 이 작업을 이어서 돌리므로 감정서와 메일이 빠지지 않는다.
// 손님 화면도 같은 파트를 요청할 수 있는데, 파트마다 잠금이 있어 AI는 한 번만 부른다.
import { sendReportEmail } from "./mail";
import { getReport, getSavedPart, getSavedParts, lockPart, markMailed, savePart, unlockPart, unmarkMailed, type Report } from "./orders";
import { generatePart, ReadingError } from "./reading";
import type { ReportPartKey as PartKey, PartResult } from "./report-shared";

export type EnsureResult = { status: "done"; result: PartResult } | { status: "pending" };

/** 저장된 풀이가 있으면 돌려주고, 없으면 잠금을 잡아 새로 쓴다. 다른 곳에서 쓰는 중이면 pending. */
export async function ensurePart(report: Report, part: PartKey, origin?: string): Promise<EnsureResult> {
  const token = report.order.token!;
  const saved = await getSavedPart(token, part);
  if (saved) return { status: "done", result: saved };
  if (!(await lockPart(token, part))) return { status: "pending" };
  try {
    // 잠금을 잡는 사이 다른 곳에서 막 저장했을 수 있다.
    const again = await getSavedPart(token, part);
    if (again) return { status: "done", result: again };
    const result = part === "naming" ? await writeNaming(report) : await generatePart(report.chart, part);
    await savePart(token, part, result, report.expiresAt);
    await sendCompletionIfReady(report, origin);
    return { status: "done", result };
  } finally {
    await unlockPart(token, part);
  }
}

/** 작명록: 신청서(성씨·돌림자 등)로 이름을 뽑고 문장을 쓴다. 한자 자료가 커서 필요할 때만 불러온다. */
async function writeNaming(report: Report): Promise<PartResult> {
  if (!report.order.naming) throw new ReadingError("작명 신청 내용이 없습니다. 고객센터로 문의해 주세요.", 400);
  const { generateNaming } = await import("./naming/generate");
  return { part: "naming", naming: await generateNaming(report.chart, report.order.naming) };
}

/** 상품의 모든 파트가 저장됐으면 완성 메일을 보낸다(주문당 한 번). */
export async function sendCompletionIfReady(report: Report, origin?: string): Promise<boolean> {
  if (!origin) return false;
  const saved = await getSavedParts(report.order.token!, report.product.parts);
  if (report.product.parts.some((p) => !saved[p])) return false;
  if (!(await markMailed(report.order.id))) return false;
  const ok = await sendReportEmail(report.order, `${origin}/r/${report.order.token}`, report.expiresAt);
  // 메일 설정이 없거나 실패하면 표시를 지워, 나중에 다시 보낼 수 있게 한다.
  if (!ok) await unmarkMailed(report.order.id);
  return ok;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 결제 직후 서버에서 감정서 전체를 쓴다. 파트들은 동시에 쓰고, 다른 곳(손님 화면)이 쓰는 중인 파트는 끝날 때까지 기다린다.
 * 한 파트가 실패해도 나머지는 계속 쓴다. 실패한 파트는 손님이 리포트 화면을 열 때 다시 쓴다.
 */
export async function completeReport(token: string, origin: string, deadlineMs = 280_000): Promise<void> {
  const report = await getReport(token);
  if (!report || report.expired) return;
  const until = Date.now() + deadlineMs;
  await Promise.all(
    report.product.parts.map(async (part) => {
      while (Date.now() < until) {
        try {
          const r = await ensurePart(report, part, origin);
          if (r.status === "done") return;
        } catch (error) {
          console.error("감정서 작성 실패", report.order.id, part, error);
          return;
        }
        await sleep(5000);
      }
    }),
  );
  await sendCompletionIfReady(report, origin);
}
