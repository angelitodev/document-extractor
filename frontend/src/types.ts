export type FieldType =
  "string" | "number" | ["string", "null"] | ["number", "null"];

export type TemplateField = {
  type: FieldType;
  description: string;
  label?: string;
};

export type Template = {
  id: string;
  templateName: string;
  properties: Record<string, TemplateField>;
};
