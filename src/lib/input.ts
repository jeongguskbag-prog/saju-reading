import { z } from "zod";
import type { BirthInput } from "./saju/calc";
import { engineText } from "./saju/locale";

export const birthInputSchema = z.object({
  name: z.string().max(40).optional(),
  gender: z.enum(["male", "female"]),
  calendar: z.enum(["solar", "lunar"]),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  isLeapMonth: z.boolean().optional(),
  hour: z.number().int().min(0).max(23).nullable(),
  minute: z.number().int().min(0).max(59).nullable().optional(),
  region: z.enum(["KR", "TW", "HK", "CN"]).optional(),
  locale: z.enum(["ko", "zh-Hant", "zh-Hans"]).optional(),
  life: z
    .object({
      marital: z.enum(["married", "dating", "single"]).optional(),
      children: z.boolean().optional(),
    })
    .optional(),
  options: z
    .object({
      solarTimeCorrection: z.boolean().optional(),
      longitude: z.number().min(-180).max(180).optional(),
      dayBoundary: z.enum(["at23", "at0"]).optional(),
    })
    .optional(),
});

export function parseBirthInput(body: unknown): { ok: true; value: BirthInput } | { ok: false; error: string } {
  const r = birthInputSchema.safeParse(body);
  if (!r.success) {
    const asked = (body as { locale?: unknown } | null)?.locale;
    const locale = asked === "zh-Hant" || asked === "zh-Hans" ? asked : "ko";
    return { ok: false, error: engineText(locale).inputError };
  }
  return { ok: true, value: r.data };
}
