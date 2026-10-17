// /r/토큰/pdf, /r/토큰/html: 문자·메일의 "파일 받기" 링크. 열 때마다 감정서 화면을 파일로 만들어 내려준다.
import { getReport, getSavedParts, markSaved } from "./orders";
import { attachmentHeader, renderReportFiles } from "./render";
import { originFrom } from "./site";
import { webRevealMinutes } from "./delivery";

const text = (msg: string, status: number) =>
  new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function fileResponse(request: Request, token: string, ext: "pdf" | "html"): Promise<Response> {
  const report = await getReport(token);
  if (!report) return text("감정서를 찾을 수 없습니다.", 404);
  if (report.expired) return text("감정서 열람 기간이 지났습니다.", 410);
  const openAt = new Date(report.order.paidAt ?? report.order.createdAt).getTime() + webRevealMinutes() * 60_000;
  if (Date.now() < openAt) return text("감정서를 작성하고 있습니다. 결제 약 3분 뒤부터 받으실 수 있습니다.", 425);
  const saved = await getSavedParts(token, report.product.parts);
  if (report.product.parts.some((p) => !saved[p])) {
    return text("감정서를 아직 작성하고 있습니다. 완성된 뒤에 다시 받아 주세요.", 409);
  }
  try {
    const files = await renderReportFiles(originFrom(request.headers), report);
    const body = ext === "pdf" ? new Uint8Array(files.pdf) : files.html;
    // 저장한 파일은 나중에 다시 보내지 않는다(10분 뒤 발송은 저장하지 않은 손님에게만).
    await markSaved(report.order.id, ext).catch(() => {});
    return new Response(body, {
      headers: {
        "Content-Type": ext === "pdf" ? "application/pdf" : "text/html; charset=utf-8",
        "Content-Disposition": attachmentHeader(files.baseName, ext),
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("감정서 파일 만들기 실패", report.order.id, error);
    return text("파일을 만들지 못했습니다. 잠시 뒤 다시 시도하시거나 감정서 화면에서 'PDF로 저장'을 눌러 주세요.", 500);
  }
}
