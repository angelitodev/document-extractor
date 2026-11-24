import type { Request, Response } from "express";
import type { UploadedFile } from "express-fileupload";
import { extractFile } from "@services/extract-file.js";

export async function extractFileController(req: Request, res: Response) {
  const file: UploadedFile | UploadedFile[] | undefined = req.files?.file;
  if (!file || Array.isArray(file)) {
    return res.status(400).json({ error: "Invalid file" });
  }

  const templateId = req.body?.templateId;
  if (typeof templateId !== "string" || !templateId.trim()) {
    return res.status(400).json({ error: "Invalid templateId" });
  }

  try {
    const result = await extractFile(file.name, file.data, templateId.trim());
    if (!result) {
      return res.status(404).json({ error: "Template not found" });
    }

    return res.json(result);
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: "Processing failed" });
  }
}
