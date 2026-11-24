import { PDFParse } from "pdf-parse";
import type { ParsedFile } from "@/types/files.js";

export async function parsePDF(
  fileName: string,
  file: Buffer,
): Promise<ParsedFile> {
  const parser = new PDFParse({ data: file });
  try {
    const data = await parser.getText();
    return {
      name: fileName,
      content: data.text,
    };
  } finally {
    await parser.destroy();
  }
}
