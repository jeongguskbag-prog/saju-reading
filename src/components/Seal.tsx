import { useId } from "react";

const NUMERALS = ["壹", "貳", "參", "肆", "伍"];

/**
 * 등급 낙관(붉은 도장). 글자를 하얗게 파낸 주문인(朱文印) 모양에 인주가 고르지 않게 묻은 질감을 더한다.
 * level 1~5 → "壹等" … "伍等" 세로 두 글자.
 */
export default function Seal({ level, size = "md", animate = false, label }: { level: number; size?: "md" | "lg"; animate?: boolean; label?: string }) {
  const id = useId().replace(/:/g, "");
  const ch = NUMERALS[level - 1] ?? "壹";
  return (
    <svg
      viewBox="0 0 100 100"
      className={`seal seal-stamp${size === "lg" ? " seal-lg" : ""}${animate ? " animate" : ""}`}
      role="img"
      aria-label={label ?? `${level}등급 도장`}
    >
      <defs>
        {/* 인주가 종이에 묻을 때의 거친 가장자리와 얼룩 */}
        <filter id={`ink-${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={level * 7} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
        </filter>
        <filter id={`grain-${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed={level * 3} result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.22" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#ink-${id})`}>
        <g filter={`url(#grain-${id})`}>
          <rect className="seal-bg" x="6" y="6" width="88" height="88" rx="5" />
        </g>
        <rect className="seal-line" x="13" y="13" width="74" height="74" rx="2" />
        <text className="seal-char" x="50" y="46" textAnchor="middle">{ch}</text>
        <text className="seal-char" x="50" y="80" textAnchor="middle">等</text>
      </g>
    </svg>
  );
}
