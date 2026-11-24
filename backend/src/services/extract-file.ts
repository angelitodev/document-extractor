import db from "../db/index.ts";
import { parserFile } from "../parsers/index.ts";
import { extractInfo } from "../ai/files.ts";
import type { ExtractedInfo } from "../types/templates.ts";

export async function extractFile(
  fileName: string,
  file: Buffer,
  templateId: string,
): Promise<ExtractedInfo | null> {
  const template = await db.templates(templateId);
  if (!template) {
    return null;
  }

  const parsedFile = await parserFile(fileName, file);
  return extractInfo(parsedFile, template);
}
