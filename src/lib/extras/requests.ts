// 추가 상품 신청서(화면·서버 공용). 서버는 이 스키마로 다시 검사한다.
import { z } from "zod";
import { birthInputSchema } from "../input";
import type { ExtraKind } from "./kinds";

export const GUNGHAP_RELATIONS = { couple: "연인", married: "부부", business: "동업·협업" } as const;
export type GunghapRelation = keyof typeof GUNGHAP_RELATIONS;

export const gunghapRequestSchema = z.object({
  relation: z.enum(["couple", "married", "business"]),
  partner: birthInputSchema.extend({ name: z.string().trim().min(1, "상대 분의 성함을 적어 주세요.").max(40) }),
});
export type GunghapRequest = z.infer<typeof gunghapRequestSchema>;

/** 신년 운세록: 볼 해(올해 또는 내년) */
export const newyearRequestSchema = z.object({ year: z.number().int().min(2000).max(2100) });
export type NewyearRequest = z.infer<typeof newyearRequestSchema>;

/** 한국 시간 기준 올해·내년 */
export const newyearChoices = (now = new Date()): [number, number] => {
  const y = new Date(now.getTime() + 9 * 3_600_000).getUTCFullYear();
  return [y, y + 1];
};

/** 택일록 */
export const TAEKIL_PURPOSES = { wedding: "결혼", move: "이사·입주", opening: "개업", contract: "계약", travel: "여행·출장", construction: "공사·인테리어" } as const;
export type TaekilPurpose = keyof typeof TAEKIL_PURPOSES;
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const taekilRequestSchema = z.object({
  purpose: z.enum(["wedding", "move", "opening", "contract", "travel", "construction"]),
  start: ymd,
  end: ymd,
  weekendsOnly: z.boolean().optional(),
});
export type TaekilRequest = z.infer<typeof taekilRequestSchema>;
export const TAEKIL_MAX_DAYS = 92;

/** 기간 검사: 내일부터 1년 안, 최대 92일. 문제가 있으면 문구를 돌려준다. */
export function checkTaekilRange(start: string, end: string, now = new Date()): string | null {
  const t = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const k = new Date(now.getTime() + 9 * 3_600_000);
  const today = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
  const a = t(start);
  const b = t(end);
  if (!Number.isFinite(a) || !Number.isFinite(b) || new Date(a).toISOString().slice(0, 10) !== start || new Date(b).toISOString().slice(0, 10) !== end) return "날짜를 확인해 주세요.";
  if (a <= today) return "시작일은 내일 이후로 골라 주세요.";
  if (b < a) return "끝나는 날이 시작일보다 앞섭니다.";
  if ((b - a) / 86_400_000 + 1 > TAEKIL_MAX_DAYS) return `기간은 ${TAEKIL_MAX_DAYS}일(약 3개월)까지 고를 수 있습니다.`;
  if (b - today > 400 * 86_400_000) return "1년 안의 날짜로 골라 주세요.";
  return null;
}

/** 주역 점 */
export const ICHING_TOPICS = { general: "전반", love: "애정·인연", work: "일·진로", money: "재물·사업", relation: "사람 관계", move: "이동·변화" } as const;
export type IchingTopic = keyof typeof ICHING_TOPICS;
export const ichingRequestSchema = z.object({
  topic: z.enum(["general", "love", "work", "money", "relation", "move"]),
  question: z.string().trim().min(5, "물으실 내용을 5자 이상 적어 주세요.").max(200, "물으실 내용은 200자까지 적을 수 있습니다."),
});
export type IchingRequest = z.infer<typeof ichingRequestSchema>;

const SCHEMAS: Partial<Record<ExtraKind, z.ZodType>> = {
  iching: ichingRequestSchema,
  taekil: taekilRequestSchema,
  gunghap: gunghapRequestSchema,
  newyear: newyearRequestSchema,
};

export type ExtraRequestParse = { ok: true; value: unknown } | { ok: false; error: string };

/** 신청서를 검사한다. 신청서가 필요 없는 상품은 빈 객체를 돌려준다. */
export function parseExtraRequest(kind: ExtraKind, raw: unknown): ExtraRequestParse {
  const schema = SCHEMAS[kind];
  if (!schema) return { ok: true, value: {} };
  const r = schema.safeParse(raw);
  if (r.success) return { ok: true, value: r.data };
  const first = r.error.issues[0];
  return { ok: false, error: first?.message && !/^(Invalid|Expected|Required)/.test(first.message) ? first.message : "신청 내용을 확인해 주세요." };
}
