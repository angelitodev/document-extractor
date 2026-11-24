import assert from "node:assert/strict";
import { test } from "node:test";

import { extractInfo } from "../src/ai/files.ts";
import type { AITemplateExtractor } from "../src/types/templates.ts";

// CI needs OPENAI_API_KEY (or OPEN_AI) and MODEL.
const template: AITemplateExtractor = {
  type: "object",
  templateName: "Invoice",
  properties: {
    invoiceNumber: { type: "string", description: "Invoice number" },
  },
  required: ["invoiceNumber"],
  additionalProperties: false,
};

test(
  "extracts an invoice number with OpenAI",
  { timeout: 120_000 },
  async () => {
    const result = await extractInfo(
      { name: "invoice.txt", content: "Invoice number: INV-123" },
      template,
    );

    assert.deepEqual(result, { invoiceNumber: "INV-123" });
  },
);
