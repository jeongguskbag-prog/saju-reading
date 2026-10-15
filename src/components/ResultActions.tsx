"use client";

import type { SajuChart } from "@/lib/saju/calc";
import { buildResultHtml, exportHtml, exportPdf, resultFileName } from "@/lib/export";
import { useT } from "./LocaleProvider";

/** 결과 아래 PDF·HTML 저장 버튼. 풀이를 쓰는 중이면 끝난 뒤 저장하게 막는다. */
export default function ResultActions({ chart, busy }: { chart: SajuChart; busy: boolean }) {
  const t = useT();
  const fileName = () => resultFileName(chart.input.name, chart.solarDate, t);
  return (
    <div className="result-actions no-print">
      <div className="action-buttons">
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => exportPdf(fileName())}>
          {t.savePdf}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={() => {
            const name = fileName();
            const result = document.getElementById("result");
            if (result) exportHtml(name, `saju-result_${chart.solarDate}`, buildResultHtml(result, name, t.htmlLang));
          }}
        >
          {t.saveHtml}
        </button>
      </div>
      <p className="muted">
        {busy ? t.saveBusy : t.saveHelp}
      </p>
    </div>
  );
}
