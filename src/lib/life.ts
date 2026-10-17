import type { BirthInput } from "./saju/calc";

/** 손님이 알려 준 결혼·자녀 상황을 감정서에 적을 말로. 고르지 않았으면 null. */
export function lifeLabel(life: BirthInput["life"]): string | null {
  if (!life) return null;
  const m = { married: "기혼", dating: "연애 중", single: "싱글" } as const;
  const parts = [life.marital ? m[life.marital] : null, life.children === undefined ? null : life.children ? "자녀 있음" : "자녀 없음"].filter(
    (x): x is string => Boolean(x),
  );
  return parts.length ? parts.join(" · ") : null;
}
