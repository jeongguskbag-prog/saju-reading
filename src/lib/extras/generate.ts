// 추가 상품을 계산하고 문장을 쓴다(서버 전용). 상품마다 필요한 엔진만 불러온다.
import type { SajuChart } from "../saju/calc";
import type { ExtraKind, ExtraResult } from "./kinds";
import type { GunghapRequest, NewyearRequest } from "./requests";

export class ExtraError extends Error {}

/** 결제 전에 신청서로 실제 계산을 해 보아, 계산이 안 되는 신청은 미리 알려 준다. */
export async function checkExtra(chart: SajuChart, kind: ExtraKind, request: unknown, now: Date): Promise<void> {
  if (kind === "gunghap") {
    const { calculateSaju } = await import("../saju/calc");
    const r = request as GunghapRequest;
    calculateSaju({ ...r.partner, ...(chart.input.locale ? { locale: chart.input.locale } : {}) }, now);
    return;
  }
  if (kind === "newyear") {
    const { newyearChoices } = await import("./requests");
    if (!newyearChoices(now).includes((request as NewyearRequest).year)) throw new ExtraError("올해나 내년 중에서 골라 주세요.");
    return;
  }
  throw new ExtraError("아직 준비 중인 상품입니다.");
}

export async function generateExtra(chart: SajuChart, kind: ExtraKind, request: unknown, paidAt: Date): Promise<ExtraResult> {
  if (kind === "gunghap") {
    const { generateGunghap } = await import("./gunghap");
    return generateGunghap(chart, request as GunghapRequest, paidAt);
  }
  if (kind === "newyear") {
    const { generateNewyear } = await import("./newyear");
    return generateNewyear(chart, request as NewyearRequest);
  }
  throw new ExtraError("아직 준비 중인 상품입니다.");
}
