import sharp from "sharp";
import type { ParsedFile } from "@/types/files.js";

const QUALITY = 30;

export async function parseImageFile(
  fileName: string,
  content: Buffer,
): Promise<ParsedFile> {
  const webp = await sharp(content)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  return {
    name: fileName,
    content: webp.toString("base64"),
  };
}
