"use client";

import type { SajuChart } from "@/lib/saju/calc";
import { buildResultHtml, exportHtml, exportPdf, resultFileName } from "@/lib/export";
import { getMessages, type Locale } from "@/lib/i18n";

/** 결과 아래 PDF·HTML 저장 버튼. 풀이를 쓰는 중이면 끝난 뒤 저장하게 막는다. */
export default function ResultActions({ chart, busy, locale }: { chart: SajuChart; busy: boolean; locale?: Locale }) {
  const a = getMessages(locale).actions;
  return (
    <div className="result-actions no-print">
      <div className="action-buttons">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => exportPdf(resultFileName(chart.input.name, chart.solarDate))}>
          {a.pdf}
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
          {a.html}
        </button>
      </div>
      <p className="muted">
        {busy ? a.busy : a.hint}
      </p>
    </div>
  );
}
