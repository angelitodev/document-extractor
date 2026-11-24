import test from "node:test";
import assert from "node:assert/strict";
import { parseTemplateInput } from "../src/services/template-schema.ts";

test("builds a strict-mode compatible schema", () => {
  const result = parseTemplateInput({
    templateName: "Invoice",
    properties: {
      total: { type: ["number", "null"], description: "Invoice total", label: "Total" },
      vendor: { type: "string", description: "Vendor name", label: "Vendor" },
    },
  });
  assert.ok(result.ok);
  assert.equal(result.template.type, "object");
  assert.deepEqual(result.template.required, ["total", "vendor"]);
  assert.equal(result.template.additionalProperties, false);
});

test("rejects empty properties", () => {
  const result = parseTemplateInput({ templateName: "X", properties: {} });
  assert.equal(result.ok, false);
});

test("rejects invalid field names and missing name", () => {
  assert.equal(
    parseTemplateInput({
      templateName: "X",
      properties: { "bad name": { type: "string", description: "d", label: "L" } },
    }).ok,
    false,
  );
  assert.equal(
    parseTemplateInput({
      templateName: " ",
      properties: { a: { type: "string", description: "d", label: "L" } },
    }).ok,
    false,
  );
});

test("rejects a missing field label", () => {
  assert.equal(
    parseTemplateInput({
      templateName: "X",
      properties: { a: { type: "string", description: "d" } },
    }).ok,
    false,
  );
});
