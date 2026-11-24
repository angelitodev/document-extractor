/**
{
  templateName: "NationalID",
  properties: {
    userName: {
      description: "..."
    }
  }
}
 */

export type FieldExtractorItem = {
  type: "string" | "number" | ["string", "null"] | ["number", "null"];
  description: string;
  /** Display name for the UI only; never sent to the model. */
  label?: string;
  enum?: (string | null)[];
};

export type AITemplateExtractor = {
  type: "object";
  templateName: string;
  properties: Record<string, FieldExtractorItem>;
  required: string[];
  additionalProperties: boolean;
};

export type ExtractedInfo = Partial<Record<string, string | null>>;
