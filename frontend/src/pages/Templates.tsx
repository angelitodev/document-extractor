import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import Header from "../components/Header";
import { API_BASE, responseError } from "../lib/api";
import { readableFieldName } from "../lib/format";
import type { Template } from "../types";

type FieldDraft = {
  key: string;
  label: string;
  name: string;
  kind: "string" | "number";
  nullable: boolean;
  description: string;
};
type Draft = { id: string | null; templateName: string; fields: FieldDraft[] };

let keyCounter = 0;
const newField = (partial: Partial<FieldDraft> = {}): FieldDraft => ({
  key: `f${keyCounter++}`,
  label: "",
  name: "",
  kind: "string",
  nullable: true,
  description: "",
  ...partial,
});
const toFieldName = (label: string) => {
  const words = label
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const name = words
    .map(
      (word, i) =>
        (i === 0
          ? word.charAt(0).toLowerCase()
          : word.charAt(0).toUpperCase()) + word.slice(1),
    )
    .join("");
  return /^[0-9]/.test(name) ? `field${name}` : name;
};
const COLUMNS = [
  "label",
  "name",
  "type",
  "description",
  "required",
  "remove",
] as const;

// Arrow keys move focus between field controls: up/down within a column,
// left/right within a row (text inputs only when the caret is at the edge).
function navigateFields(event: KeyboardEvent<HTMLDivElement>) {
  const { key } = event;
  if (
    !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key) ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;
  const target = (event.target as HTMLElement).closest<HTMLElement>(
    "[data-col]",
  );
  const row = target?.closest<HTMLElement>(".field-row");
  if (!target || !row) return;
  const column = target.dataset.col as (typeof COLUMNS)[number];

  let next: HTMLElement | null | undefined;
  if (key === "ArrowUp" || key === "ArrowDown") {
    const rows = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(".field-row[data-row]"),
    );
    const sibling = rows[rows.indexOf(row) + (key === "ArrowDown" ? 1 : -1)];
    next = sibling?.querySelector<HTMLElement>(`[data-col="${column}"]`);
  } else {
    if (target instanceof HTMLInputElement && target.type === "text") {
      const { selectionStart, selectionEnd, value } = target;
      if (selectionStart !== selectionEnd) return;
      if (key === "ArrowLeft" && selectionStart !== 0) return;
      if (key === "ArrowRight" && selectionStart !== value.length) return;
    }
    const nextColumn =
      COLUMNS[COLUMNS.indexOf(column) + (key === "ArrowRight" ? 1 : -1)];
    next = nextColumn
      ? row.querySelector<HTMLElement>(`[data-col="${nextColumn}"]`)
      : null;
  }
  event.preventDefault();
  next?.focus();
}

const emptyDraft = (): Draft => ({
  id: null,
  templateName: "",
  fields: [newField()],
});

function toDraft(template: Template): Draft {
  return {
    id: template.id,
    templateName: template.templateName,
    fields: Object.entries(template.properties).map(([name, property]) => {
      const nullable = Array.isArray(property.type);
      const kind = (
        Array.isArray(property.type) ? property.type[0] : property.type
      ) as "string" | "number";
      return newField({
        name,
        kind,
        nullable,
        description: property.description,
        label: property.label ?? readableFieldName(name),
      });
    }),
  };
}

function toPayload(draft: Draft) {
  const properties: Record<
    string,
    { type: string | string[]; description: string; label?: string }
  > = {};
  for (const field of draft.fields) {
    properties[field.name.trim()] = {
      type: field.nullable ? [field.kind, "null"] : field.kind,
      description: field.description.trim(),
      ...(field.label.trim() ? { label: field.label.trim() } : {}),
    };
  }
  return { templateName: draft.templateName.trim(), properties };
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/templates`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        const data: Template[] = await response.json();
        setTemplates(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Templates are unavailable. Refresh the page to try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function select(template: Template | null) {
    setDraft(template ? toDraft(template) : emptyDraft());
    setError("");
    setNotice("");
    setConfirmDelete(false);
    setSubmitted(false);
  }

  function updateField(key: string, patch: Partial<FieldDraft>) {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.key === key ? { ...field, ...patch } : field,
      ),
    }));
  }

  // Typing a label suggests a field name until the name is edited by hand.
  function updateLabel(field: FieldDraft, label: string) {
    const followsLabel = field.name === toFieldName(field.label);
    updateField(field.key, {
      label,
      ...(followsLabel ? { name: toFieldName(label) } : {}),
    });
  }

  function fieldErrors(field: FieldDraft, fields: FieldDraft[]) {
    const name = field.name.trim();
    const errors: { label?: string; name?: string; description?: string } = {};
    if (!field.label.trim()) errors.label = "Label is required";
    if (!name) errors.name = "Field name is required";
    else if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
      errors.name = "Use letters, numbers and _, starting with a letter";
    else if (
      fields.some(
        (other) => other.key !== field.key && other.name.trim() === name,
      )
    )
      errors.name = "Field name must be unique";
    if (!field.description.trim())
      errors.description = "Description is required";
    return errors;
  }

  function validate() {
    if (!draft.templateName.trim()) return "Give the template a name.";
    if (draft.fields.length === 0) return "Add at least one field.";
    if (
      draft.fields.some(
        (field) => Object.keys(fieldErrors(field, draft.fields)).length > 0,
      )
    )
      return "Fix the highlighted fields.";
    return "";
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSubmitted(true);
    const problem = validate();
    if (problem) {
      setError(problem);
      setNotice("");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `${API_BASE}/templates${draft.id ? `/${draft.id}` : ""}`,
        {
          method: draft.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(draft)),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const saved: Template = await response.json();
      setTemplates((current) =>
        draft.id
          ? current.map((t) => (t.id === saved.id ? saved : t))
          : [...current, saved],
      );
      setDraft(toDraft(saved));
      setNotice("Template saved.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the template.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft.id || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/templates/${draft.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await responseError(response));
      setTemplates((current) => current.filter((t) => t.id !== draft.id));
      setDraft(emptyDraft());
      setConfirmDelete(false);
      setNotice("Template deleted.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not delete the template.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page page-scroll">
      <Header />
      <div className="page-content">
        <div className="intro">
          <h1>Shape what we find.</h1>
          <p>
            Create templates that describe the information to pull from a
            document.
          </p>
        </div>
        <div className="templates-layout">
          <section
            className="templates-list"
            aria-labelledby="templates-heading"
          >
            <div className="templates-list-head">
              <h2 id="templates-heading">Templates</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={() => select(null)}
              >
                + New
              </button>
            </div>
            {loading ? (
              <p className="muted">Loading templates…</p>
            ) : templates.length === 0 ? (
              <p className="muted">No templates yet.</p>
            ) : (
              <ul>
                {templates.map((template) => (
                  <li key={template.id}>
                    <button
                      type="button"
                      className={`template-item${draft.id === template.id ? " is-active" : ""}`}
                      onClick={() => select(template)}
                    >
                      <strong>{template.templateName}</strong>
                      <span>
                        {Object.keys(template.properties).length} fields
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="template-editor" aria-labelledby="editor-heading">
            <div className="panel-heading">
              <h2 id="editor-heading">
                {draft.id ? "Edit template" : "New template"}
              </h2>
              <p>
                Each field is always returned, as “Not found” when missing in
                the document.
              </p>
            </div>
            <form onSubmit={save}>
              <div className="field-group">
                <label className="field-label" htmlFor="template-name">
                  Template name
                </label>
                <input
                  id="template-name"
                  className="text-input"
                  value={draft.templateName}
                  onChange={(event) =>
                    setDraft({ ...draft, templateName: event.target.value })
                  }
                  placeholder="e.g. Invoice"
                />
              </div>

              <div className="field-group">
                <span className="field-label">Fields</span>
                <div className="field-rows" onKeyDown={navigateFields}>
                  <div className="field-row field-row-head" aria-hidden="true">
                    <span>Label *</span>
                    <span>Field name</span>
                    <span>Type</span>
                    <span>Description</span>
                    <span>Required</span>
                    <span />
                  </div>
                  {draft.fields.map((field) => {
                    const errors = submitted
                      ? fieldErrors(field, draft.fields)
                      : {};
                    return (
                      <div className="field-row" data-row key={field.key}>
                        <input
                          className={`text-input${errors.label ? " is-invalid" : ""}`}
                          data-col="label"
                          aria-label="Field label"
                          aria-invalid={!!errors.label}
                          title={errors.label}
                          required
                          value={field.label}
                          onChange={(event) =>
                            updateLabel(field, event.target.value)
                          }
                          placeholder="User full name"
                        />
                        <input
                          className={`text-input field-key${errors.name ? " is-invalid" : ""}`}
                          data-col="name"
                          aria-label="Field name"
                          aria-invalid={!!errors.name}
                          title={errors.name}
                          value={field.name}
                          onChange={(event) =>
                            updateField(field.key, { name: event.target.value })
                          }
                          placeholder="fieldName"
                        />
                        <select
                          className="text-input select-input"
                          data-col="type"
                          aria-label="Field type"
                          value={field.kind}
                          onChange={(event) =>
                            updateField(field.key, {
                              kind: event.target.value as "string" | "number",
                            })
                          }
                        >
                          <option value="string">Text</option>
                          <option value="number">Number</option>
                        </select>
                        <input
                          className={`text-input field-description${errors.description ? " is-invalid" : ""}`}
                          data-col="description"
                          aria-label="Field description"
                          aria-invalid={!!errors.description}
                          title={errors.description}
                          value={field.description}
                          onChange={(event) =>
                            updateField(field.key, {
                              description: event.target.value,
                            })
                          }
                          placeholder="What should we find?"
                        />
                        <label className="check">
                          <input
                            type="checkbox"
                            data-col="required"
                            aria-label="Required"
                            checked={!field.nullable}
                            onChange={(event) =>
                              updateField(field.key, {
                                nullable: !event.target.checked,
                              })
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="icon-button"
                          data-col="remove"
                          aria-label={`Remove field ${field.name || ""}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              fields: draft.fields.filter(
                                (f) => f.key !== field.key,
                              ),
                            })
                          }
                        >
                          ×
                        </button>
                        {(errors.label ||
                          errors.name ||
                          errors.description) && (
                          <p className="field-error" role="alert">
                            {[errors.label, errors.name, errors.description]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      fields: [...draft.fields, newField()],
                    })
                  }
                >
                  + Add field
                </button>
              </div>

              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="success-message" role="status">
                  {notice}
                </p>
              )}

              <div className="editor-actions">
                <button
                  className="extract-button"
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving…"
                    : draft.id
                      ? "Save changes"
                      : "Create template"}
                </button>
                {draft.id &&
                  (confirmDelete ? (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={remove}
                      disabled={saving}
                    >
                      Confirm delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </button>
                  ))}
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
