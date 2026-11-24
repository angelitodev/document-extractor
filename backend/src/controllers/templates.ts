import type { Request, Response } from "express";
import db from "@db/index.js";
import { parseTemplateInput } from "@services/template-schema.js";

export async function createTemplateController(req: Request, res: Response) {
  try {
    const result = parseTemplateInput(req.body);
    if (!result.ok) return res.status(400).json({ error: result.error });
    const created = await db.createTemplate(result.template);
    return res.status(201).json(created);
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create template" });
  }
}

export async function updateTemplateController(req: Request, res: Response) {
  try {
    const result = parseTemplateInput(req.body);
    if (!result.ok) return res.status(400).json({ error: result.error });
    const updated = await db.updateTemplate(String(req.params.id), result.template);
    if (!updated) return res.status(404).json({ error: "Template not found" });
    return res.json(updated);
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update template" });
  }
}

export async function deleteTemplateController(req: Request, res: Response) {
  try {
    const deleted = await db.deleteTemplate(String(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Template not found" });
    return res.status(204).end();
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: "Failed to delete template" });
  }
}

export async function listTemplatesController(req: Request, res: Response) {
  try {
    const templates = await db.listTemplates()
    return res.json(templates);
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load templates" });
  }
}
