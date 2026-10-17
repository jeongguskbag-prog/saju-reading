// 추가 상품 신청서를 한 줄로(관리 화면·감정서 표지 공용)
import type { ExtraKind } from "./kinds";
import { GUNGHAP_RELATIONS, type GunghapRequest } from "./requests";

const p2 = (n: number) => String(n).padStart(2, "0");

export function birthLine(i: { gender: "male" | "female"; calendar: "solar" | "lunar"; isLeapMonth?: boolean; year: number; month: number; day: number; hour: number | null; minute?: number | null }): string {
  const cal = i.calendar === "solar" ? "양력" : `음력${i.isLeapMonth ? "(윤달)" : ""}`;
  const time = i.hour === null ? "시각 모름" : `${p2(i.hour)}:${p2(i.minute ?? 0)}`;
  return `${i.gender === "male" ? "남" : "여"} · ${i.year}년 ${i.month}월 ${i.day}일 ${time} (${cal})`;
}

export function extraRequestSummary(kind: ExtraKind, request: unknown): string {
  if (kind === "gunghap") {
    const r = request as GunghapRequest;
    return `${GUNGHAP_RELATIONS[r.relation]} · 상대 ${r.partner.name} ${birthLine(r.partner)}`;
  }
  if (kind === "newyear") return `${(request as { year: number }).year}년`;
  return "";
}
