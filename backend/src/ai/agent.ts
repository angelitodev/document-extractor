import OpenAI from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import "dotenv/config";
import config from "@config";
import type { AITemplateExtractor, ExtractedInfo } from "@/types/templates.js";

async function agent(
  messages: ResponseInput,
  template: AITemplateExtractor,
): Promise<ExtractedInfo> {
  const model = config("ai", "MODEL");
  const apiKey = config("ai", "API_KEY");
  if (!model || !apiKey) {
    throw new Error(
      "Set MODEL and OPEN_AI (or OPENAI_API_KEY) before extracting files",
    );
  }

  const openai = new OpenAI({ apiKey });
  const { templateName, ...rest } = template;
  // `label` is UI-only metadata; strict mode rejects unknown keywords.
  const schema = {
    ...rest,
    properties: Object.fromEntries(
      Object.entries(rest.properties).map(([key, { label: _label, ...field }]) => [key, field]),
    ),
  };
  const response = await openai.responses.create({
    model,
    input: messages,
    store: false,
    text: {
      format: {
        type: "json_schema",
        name: "document_extraction",
        description: templateName,
        schema,
        strict: true,
      },
    },
  });

  if (response.status !== "completed" || !response.output_text) {
    throw new Error("OpenAI did not return a completed extraction");
  }

  console.log('response', response.usage)

  return JSON.parse(response.output_text) as ExtractedInfo;
}

export default agent;
