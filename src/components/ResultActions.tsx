"use client";

import type { SajuChart } from "@/lib/saju/calc";
import { buildResultHtml, exportHtml, exportPdf, resultFileName } from "@/lib/export";

/** 결과 아래 PDF·HTML 저장 버튼. 풀이를 쓰는 중이면 끝난 뒤 저장하게 막는다. */
export default function ResultActions({ chart, busy }: { chart: SajuChart; busy: boolean }) {
  return (
    <div className="result-actions no-print">
      <div className="action-buttons">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => exportPdf(resultFileName(chart.input.name, chart.solarDate))}>
          PDF로 저장
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => {
            const fileName = resultFileName(chart.input.name, chart.solarDate);
            const result = document.getElementById("result");
            if (result) exportHtml(fileName, `saju-result_${chart.solarDate}`, buildResultHtml(result, fileName));
          }}
        >
          HTML로 저장
        </button>
      </div>
      <p className="muted">
        {busy
          ? "풀이가 끝나면 풀이까지 포함해 저장할 수 있습니다."
          : "PDF는 인쇄 화면에서 “PDF로 저장”을 고르세요. PDF를 못 여는 분께는 HTML 파일을 보내 주세요(인터넷 브라우저로 열림)."}
      </p>
    </div>
  );
}
