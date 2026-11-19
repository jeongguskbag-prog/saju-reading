"use client";

import { useEffect, useState } from "react";
import type { SajuChart } from "@/lib/saju/calc";
import { luckyColor, type LuckyColor } from "@/lib/saju/lucky-color";

/** 오늘의 행운 색 카드. 날짜는 보는 사람의 지금 시각(한국 날짜)으로 계산한다. */
export function LuckyColorView({ c, compact = false }: { c: LuckyColor; compact?: boolean }) {
  return (
    <div className={`lucky-color${compact ? " compact" : ""}`}>
      <div className="lucky-swatches" aria-hidden="true">
        {c.swatches.map((s) => (
          <span key={s.name} className="lucky-swatch" style={{ background: s.hex }} />
        ))}
      </div>
      <p className="lucky-color-main">
        <b>{c.swatches.map((s) => s.name).join("·")}</b> <span className="muted">({c.elementKo} 기운)</span>
      </p>
      <p className="lucky-color-reason">{c.reason}</p>
      <p className="lucky-color-tip">
        추천: {c.tip} · {c.avoid.names} 계열({c.avoid.elementKo} 기운)은 오늘 조금 줄여 보세요.
      </p>
    </div>
  );
}

export default function LuckyColorCard({ chart }: { chart: SajuChart }) {
  const [c, setC] = useState<LuckyColor | null>(null);
  useEffect(() => {
    setC(luckyColor(chart));
  }, [chart]);
  if (!c) return null;
  return (
    <section className="card lucky-card no-print" aria-labelledby="lucky-h">
      <h3 id="lucky-h">오늘의 행운 색</h3>
      <p className="muted small">
        {c.date.replace(/-/g, ".")} · 오늘 일진과 내 사주의 용신으로 계산했습니다. 재미로 참고해 주세요.
      </p>
      <LuckyColorView c={c} />
      <p className="muted small">내 사주를 저장해 두면 마이 화면에서 매일 바뀌는 행운 색을 볼 수 있습니다.</p>
    </section>
  );
}
