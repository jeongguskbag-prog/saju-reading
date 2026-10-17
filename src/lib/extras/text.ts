import { z } from "zod";
import type { SectionsText } from "./kinds";

export const sectionsTextSchema: z.ZodType<SectionsText> = z.object({
  summary: z.string().min(1),
  sections: z.array(z.object({ heading: z.string().min(1), paragraphs: z.array(z.string().min(1)).min(1) })).min(1),
  advice: z.array(z.string().min(1)),
});
