import { useId } from "react";
import { GLYPHS } from "@/lib/brand/glyphs";

/** 1000×1000 칸의 글리프를 (x, y)에 w×h 크기로 놓는다. */
export function Glyph({ ch, x, y, w, h }: { ch: string; x: number; y: number; w: number; h: number }) {
  return <path d={GLYPHS[ch]} transform={`translate(${x} ${y}) scale(${w / 1000} ${h / 1000})`} />;
}

/** 인주가 종이에 묻은 듯한 거친 가장자리·얼룩 필터. seed로 도장마다 모양을 조금씩 다르게 한다. */
export function InkFilters({ id, seed }: { id: string; seed: number }) {
  return (
    <defs>
      <filter id={`ink-${id}`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed * 7} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="3" />
      </filter>
      <filter id={`grain-${id}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed={seed * 3} result="g" />
        <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.7 1.22" result="mask" />
        <feComposite in="SourceGraphic" in2="mask" operator="in" />
      </filter>
    </defs>
  );
}

/**
 * 천기록 낙관. 붉은 바탕에 天機錄을 하얗게 새긴 백문인(白文印).
 * 도장은 오른쪽 줄부터 읽는다: 오른쪽 줄 天·機, 왼쪽 줄 錄(세로로 길게).
 */
export default function BrandSeal({ size = 48, className, title = "천기록" }: { size?: number; className?: string; /** 빈 문자열이면 장식으로 보고 화면 낭독기에서 숨긴다(옆에 이름이 글로 있을 때). */ title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`brand-seal${className ? ` ${className}` : ""}`}
      {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}
    >
      <InkFilters id={id} seed={11} />
      <g filter={`url(#ink-${id})`}>
        <g filter={`url(#grain-${id})`}>
          <rect className="seal-bg" x="5" y="5" width="90" height="90" rx="4" />
        </g>
        <rect className="seal-line" x="11" y="11" width="78" height="78" rx="2" />
        <g className="seal-glyph">
          <Glyph ch="天" x={52} y={15} w={34} h={34} />
          <Glyph ch="機" x={52} y={51} w={34} h={34} />
          <Glyph ch="錄" x={15} y={15} w={34} h={70} />
        </g>
      </g>
    </svg>
  );
}
