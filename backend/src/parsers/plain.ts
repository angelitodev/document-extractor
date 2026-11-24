import type { ParsedFile } from "@/types/files.js";

export async function parsePlainFile(
  fileName: string,
  content: Buffer,
): Promise<ParsedFile> {
  return {
    name: fileName,
    content: content.toString("utf8"),
  };
}
