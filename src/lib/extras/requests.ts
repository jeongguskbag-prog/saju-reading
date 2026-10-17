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

const SCHEMAS: Partial<Record<ExtraKind, z.ZodType>> = {
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
