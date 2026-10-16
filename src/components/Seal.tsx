import { useId } from "react";
import { Glyph, InkFilters } from "./BrandSeal";
import { GRADE_TIERS } from "@/lib/saju/grade";

/**
 * 사주 유형 낙관(붉은 도장). 브랜드 낙관과 같은 백문인 모양에 유형 두 글자(天福·氣勢·中和·大器·開拓)를 세로로 새긴다.
 * 숫자 등급(壹等…伍等) 대신 유형을 새겨, 낮은 숫자를 받은 느낌이 들지 않게 한다.
 * 글자는 글꼴이 아닌 경로로 그려 어느 기기·PDF에서나 같은 모양으로 나온다.
 */
export default function Seal({ level, size = "md", animate = false, label }: { level: number; size?: "md" | "lg"; animate?: boolean; label?: string }) {
  const id = useId().replace(/:/g, "");
  const tier = GRADE_TIERS.find((x) => x.level === level) ?? GRADE_TIERS[2];
  const [c1, c2] = [...tier.seal];
  return (
    <svg
      viewBox="0 0 100 100"
      className={`seal seal-stamp${size === "lg" ? " seal-lg" : ""}${animate ? " animate" : ""}`}
      role="img"
      aria-label={label ?? `${tier.type} 도장`}
    >
      <InkFilters id={id} seed={level} />
      <g filter={`url(#ink-${id})`}>
        <g filter={`url(#grain-${id})`}>
          <rect className="seal-bg" x="6" y="6" width="88" height="88" rx="5" />
        </g>
        <rect className="seal-line" x="13" y="13" width="74" height="74" rx="2" />
        <g className="seal-glyph">
          <Glyph ch={c1} x={32} y={16} w={36} h={34} />
          <Glyph ch={c2} x={32} y={51} w={36} h={34} />
        </g>
      </g>
    </svg>
  );
}
