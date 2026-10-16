// 결과 화면을 PDF 또는 HTML 파일로 내보낸다.
// - 웹: 브라우저 인쇄 창(대상: "PDF로 저장")
// - Android 앱: WebView는 window.print()를 지원하지 않으므로 앱이 넣어 준 AndroidBridge로 시스템 인쇄(PDF 저장)를 연다.

interface AndroidBridge {
  print(jobName: string): void;
  /** 0.6.0 이후 앱에만 있다. */
  saveHtml?(fileName: string, html: string): void;
  /** 앱 전용 화면(/app)의 무료 풀이용 접근 키. 앱 1.0 이후에만 있다. */
  appKey?(): string;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridge;
  }
}

/** 파일 이름으로 쓸 수 없는 문자를 걷어 낸다. */
export function resultFileName(name: string | undefined, solarDate: string, t: { brand: string; fileResult: string } = { brand: "천기록", fileResult: "결과" }): string {
  const who = (name ?? "").replace(/[\\/:*?"<>|\s]+/g, "").slice(0, 20) || t.fileResult;
  return `${t.brand}_${who}_${solarDate}`;
}

export function exportPdf(fileName: string) {
  if (window.AndroidBridge) {
    window.AndroidBridge.print(fileName);
    return;
  }
  // 대부분의 브라우저는 문서 제목을 PDF 기본 파일 이름으로 쓴다.
  const previous = document.title;
  document.title = fileName;
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 현재 화면의 스타일시트 내용을 모은다(같은 출처의 CSS만 읽을 수 있다). */
function collectCss(): string {
  const parts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      parts.push(Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n"));
    } catch {
      // 다른 출처의 스타일시트는 건너뛴다.
    }
  }
  return parts.join("\n");
}

/**
 * 결과 영역을 하나의 HTML 파일로 만든다. 스타일을 파일 안에 넣어 인터넷 연결 없이도 같은 모양으로 열린다.
 * 버튼 등 화면 전용 요소는 빼고, PDF에만 나오던 출력 정보와 작성 방식 박스는 포함한다.
 */
export function buildResultHtml(result: HTMLElement, title: string, lang = "ko"): string {
  const clone = result.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.querySelectorAll(".no-print, .tip").forEach((el) => el.remove());
  const css = collectCss();
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
${css}
.print-only { display: block !important; }
.no-print { display: none !important; }
</style>
</head>
<body>
<main class="container${lang === "zh-Hant" ? " zh" : lang === "zh-Hans" ? " zh-hans" : ""}">
${clone.outerHTML}
</main>
</body>
</html>
`;
}

/**
 * @param fileName 앱 저장 화면에 보여 줄 이름(한글 가능)
 * @param asciiName 브라우저 다운로드용 이름. 일부 브라우저는 한글 파일 이름을 무시하고 확장자 없는 "download"로 저장해
 *   받는 사람이 파일을 열 수 없게 되므로, 웹 다운로드에는 영문 이름을 쓴다.
 */
export function exportHtml(fileName: string, asciiName: string, html: string) {
  if (window.AndroidBridge && typeof window.AndroidBridge.saveHtml === "function") {
    window.AndroidBridge.saveHtml(fileName, html);
    return;
  }
  fileName = asciiName;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
