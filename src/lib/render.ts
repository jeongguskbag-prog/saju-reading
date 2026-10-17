// 감정서를 파일로 만든다(서버 전용): 손님 화면(/r/토큰)을 헤드리스 크롬으로 열어 A4 PDF로 인쇄하고,
// 같은 화면을 스타일까지 담은 HTML 한 파일로 저장한다. 손님이 직접 "PDF로 저장"할 때와 같은 모양이 나온다.
// - Vercel: @sparticuz/chromium(서버리스용 크롬)
// - 내 컴퓨터·시험: CHROMIUM_PATH에 설치된 크롬 경로
import type { Browser } from "puppeteer-core";
import type { Report } from "./orders";

export interface ReportFiles {
  pdf: Buffer;
  html: string;
  /** 파일 이름(확장자 제외). 예: 천기록_홍길동_종합감정서 */
  baseName: string;
}

export class RenderError extends Error {}

async function launch(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;
  const local = process.env.CHROMIUM_PATH;
  if (local) {
    return puppeteer.launch({ executablePath: local, headless: true, args: ["--no-sandbox", "--font-render-hinting=none"] });
  }
  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
    headless: "shell",
  });
}

/** 파일 이름에 쓸 수 없는 글자를 걷어 낸다. */
export function reportBaseName(report: Pick<Report, "order" | "product">): string {
  const clean = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, "").slice(0, 20);
  return `천기록_${clean(report.order.input.name ?? "") || "감정서"}_${clean(report.product.name.replace(/^천기록 /, ""))}`;
}

/**
 * 완성된 감정서를 PDF·HTML로 만든다. 감정서 화면이 모든 파트를 보여 줄 때까지 기다린다.
 * @param origin 이 사이트 주소(예: https://saju-reading-azure.vercel.app)
 */
export async function renderReportFiles(origin: string, report: Report): Promise<ReportFiles> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1200 });
    const url = `${origin}/r/${report.order.token}?render=1`;
    const res = await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
    if (!res || !res.ok()) throw new RenderError(`감정서 화면을 열지 못했습니다(${res?.status() ?? "응답 없음"}).`);
    // 작성 중 표시(spinner)가 사라지고 파일 만들기 함수가 준비될 때까지
    await page.waitForFunction(
      () => !document.querySelector(".spinner") && typeof (window as unknown as { __reportHtml?: unknown }).__reportHtml === "function",
      { timeout: 60_000 },
    );
    // 서버리스 크롬에는 한글 글꼴이 없으니 이 사이트에 둔 한글 글꼴을 본문 글꼴 끝에 덧붙인다(HTML 파일에서도 열리게 절대 주소로).
    await page.evaluate(async (origin: string) => {
      const css = await fetch(`${origin}/fonts/report-sans.css`).then((r) => (r.ok ? r.text() : ""));
      const style = document.createElement("style");
      style.textContent = `${css.replaceAll("url(/fonts/", `url(${origin}/fonts/`)}
html, body { font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", "Chungirok Sans", sans-serif; }`;
      document.head.appendChild(style);
      void document.body.offsetHeight;
      await document.fonts.ready;
      // 제목·한자용 웹 글꼴(Google Fonts)을 받지 못했으면 빈 네모 대신 한글 본문 글꼴로 찍는다.
      const serifLoaded = [...document.fonts].some((f) => f.family.replace(/["']/g, "") === "Noto Serif KR" && f.status === "loaded");
      if (!serifLoaded) {
        const fallback = document.createElement("style");
        fallback.textContent = `body * { font-family: "Chungirok Sans", sans-serif !important; }`;
        document.head.appendChild(fallback);
        void document.body.offsetHeight;
        await document.fonts.ready;
      }
    }, origin);
    await page.evaluate(() => document.fonts.ready);
    const html = await page.evaluate(() => (window as unknown as { __reportHtml: () => string }).__reportHtml());
    await page.emulateMediaType("print");
    const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
    return { pdf, html, baseName: reportBaseName(report) };
  } finally {
    await browser.close().catch(() => {});
  }
}

/** Content-Disposition: 한글 파일 이름은 RFC 5987 형식으로, 옛 브라우저용 영문 이름도 함께. */
export function attachmentHeader(baseName: string, ext: "pdf" | "html"): string {
  return `attachment; filename="chungirok-report.${ext}"; filename*=UTF-8''${encodeURIComponent(`${baseName}.${ext}`)}`;
}
