// 추가 상품을 계산하고 문장을 쓴다(서버 전용). 상품마다 필요한 엔진만 불러온다.
import type { SajuChart } from "../saju/calc";
import type { ExtraKind, ExtraResult } from "./kinds";
import type { GunghapRequest, IchingRequest, NewyearRequest, TaekilRequest } from "./requests";

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
  if (kind === "taekil") {
    const { checkTaekilRange } = await import("./requests");
    const r = request as TaekilRequest;
    const problem = checkTaekilRange(r.start, r.end, now);
    if (problem) throw new ExtraError(problem);
    const { computeTaekil } = await import("./taekil");
    if (!computeTaekil(chart, r).picks.length) throw new ExtraError("고르신 기간에는 맞는 날이 없습니다. 기간을 넓히거나 주말만 보기를 꺼 주세요.");
    return;
  }
  if (kind === "iching" || kind === "love") return;
  if (kind === "ziwei") {
    if (!chart.localTime) throw new ExtraError("자미두수 명반은 태어난 시각이 있어야 세울 수 있습니다. 시각을 넣고 다시 신청해 주세요.");
    const { computeZiwei } = await import("./ziwei");
    computeZiwei(chart, now);
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
  if (kind === "ziwei") {
    const { generateZiwei } = await import("./ziwei");
    return generateZiwei(chart, paidAt);
  }
  if (kind === "love") {
    const { generateLove } = await import("./love");
    return generateLove(chart, paidAt);
  }
  if (kind === "iching") {
    const { generateIching } = await import("./iching");
    return generateIching(chart, request as IchingRequest);
  }
  if (kind === "taekil") {
    const { generateTaekil } = await import("./taekil");
    return generateTaekil(chart, request as TaekilRequest);
  }
  throw new ExtraError("아직 준비 중인 상품입니다.");
}
