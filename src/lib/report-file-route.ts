// /r/토큰/pdf, /r/토큰/html: 문자·메일의 "파일 받기" 링크. 열 때마다 감정서 화면을 파일로 만들어 내려준다.
import { getReport, getSavedParts, markSaved } from "./orders";
import { attachmentHeader, renderReportFiles } from "./render";
import { originFrom } from "./site";
import { webRevealMinutes } from "./delivery";

const plain = (msg: string, status: number) =>
  new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 휴대폰에서 버튼으로 바로 열었을 때(?nav=1)는 글자만 덩그러니 보이지 않게, 돌아가기 버튼이 있는 안내 화면으로 보여 준다. */
const page = (msg: string, status: number, token: string) =>
  new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>천기록</title>
<style>body{font-family:-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;background:#f4f1ea;color:#2a2926;margin:0;padding:40px 20px;line-height:1.7}
.box{max-width:480px;margin:0 auto;background:#fff;border:1px solid #e3e0d8;border-radius:14px;padding:24px}
a{display:inline-block;margin-top:14px;background:#b0262c;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700}</style></head>
<body><div class="box"><p>${esc(msg)}</p><a href="/r/${encodeURIComponent(token)}">감정서 화면으로 돌아가기</a></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

export async function fileResponse(request: Request, token: string, ext: "pdf" | "html"): Promise<Response> {
  const nav = new URL(request.url).searchParams.get("nav") === "1";
  const text = (msg: string, status: number) => (nav ? page(msg.replace(" 아래 '브라우저 인쇄로 PDF 저장'을 눌러 주세요.", " 잠시 뒤 다시 시도하시거나, 컴퓨터에서 받아 주세요."), status, token) : plain(msg, status));
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
    // 손님이 화면에서 내려받은 기록(관리 화면에서 본다)
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
    // 원인을 짧게 붙여 둔다(화면 캡처로 원인을 알 수 있게). 개인정보는 들어가지 않는다.
    const reason = (error as Error)?.message?.split("\n")[0]?.slice(0, 120) ?? "";
    return text(`PDF 파일을 만들지 못했습니다. 아래 '브라우저 인쇄로 PDF 저장'을 눌러 주세요.${reason ? ` (${reason})` : ""}`, 500);
  }
}
