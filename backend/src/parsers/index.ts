import mime from "mime-types";
import type { ParsedFile } from "@/types/files.js";

import { parseImageFile } from "./image.ts";
import { parsePDF } from "./pdf.ts";
import { parsePlainFile } from "./plain.ts";

export async function parserFile(
  fileName: string,
  file: Buffer,
): Promise<ParsedFile> {
  const mimeType = mime.lookup(fileName);

  if (!mimeType) {
    throw new TypeError(`Unsupported file type: ${fileName}`);
  }

  if (mimeType === "application/pdf") {
    return parsePDF(fileName, file);
  }

  if (mimeType.startsWith("image/")) {
    return parseImageFile(fileName, file);
  }

  if (mimeType.startsWith("text/") || mimeType === "application/json") {
    return parsePlainFile(fileName, file);
  }

  throw new TypeError(`Unsupported file type: ${fileName}`);
}
