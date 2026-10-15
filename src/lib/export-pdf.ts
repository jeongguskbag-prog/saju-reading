// 결과 화면을 PDF로 내보낸다.
// - 웹: 브라우저 인쇄 창(대상: "PDF로 저장")
// - Android 앱: WebView는 window.print()를 지원하지 않으므로 앱이 넣어 준 AndroidBridge로 시스템 인쇄(PDF 저장)를 연다.

interface AndroidBridge {
  print(jobName: string): void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridge;
  }
}

/** 파일 이름으로 쓸 수 없는 문자를 걷어 낸다. */
export function pdfFileName(name: string | undefined, solarDate: string): string {
  const who = (name ?? "").replace(/[\\/:*?"<>|\s]+/g, "").slice(0, 20) || "결과";
  return `사주풀이_${who}_${solarDate}`;
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
