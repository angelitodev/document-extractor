import { z } from "zod";
import type { AITemplateExtractor } from "@/types/templates.js";

const fieldSchema = z.object({
  type: z.union([
    z.literal("string"),
    z.literal("number"),
    z.tuple([z.literal("string"), z.literal("null")]),
    z.tuple([z.literal("number"), z.literal("null")]),
  ]),
  description: z.string().trim().min(1, "Field description is required"),
  label: z.string().trim().min(1, "Field label is required"),
  enum: z.array(z.string().nullable()).optional(),
});

const templateInputSchema = z.object({
  templateName: z.string().trim().min(1, "Template name is required"),
  properties: z
    .record(
      z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "Invalid field name"),
      fieldSchema,
    )
    .refine((p) => Object.keys(p).length > 0, "At least one field is required"),
});

/**
 * Validates user input and builds a schema compatible with OpenAI strict mode:
 * every property is required and additional properties are disallowed.
 */
export function parseTemplateInput(
  input: unknown,
): { ok: true; template: AITemplateExtractor } | { ok: false; error: string } {
  const parsed = templateInputSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.join(".");
    return {
      ok: false,
      error: `${path ? `${path}: ` : ""}${issue?.message ?? "Invalid template"}`,
    };
  }
  const { templateName, properties } = parsed.data;
  return {
    ok: true,
    template: {
      type: "object",
      templateName,
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    },
  };
}
