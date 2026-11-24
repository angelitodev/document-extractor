import { useEffect, useRef, useState, type FormEvent } from "react";
import Header from "./components/Header";
import { API_BASE, responseError } from "./lib/api";
import { readableFieldName } from "./lib/format";
import type { Template } from "./types";

type Extraction = Record<string, string | null>;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_LOADING_TIME = 850;

function fieldLabel(template: Template | undefined, name: string) {
  return template?.properties[name]?.label || readableFieldName(name);
}

function readableFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Extraction | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activeView, setActiveView] = useState<"setup" | "results">("setup");
  const [error, setError] = useState("");
  const [resultMode, setResultMode] = useState<"fields" | "json">("fields");
  const [copied, setCopied] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTemplates() {
      try {
        const response = await fetch(`${API_BASE}/templates`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(await responseError(response));
        const data: Template[] = await response.json();
        if (!Array.isArray(data)) throw new Error("Invalid templates response");
        setTemplates(data);
      } catch {
        if (!controller.signal.aborted)
          setError("Templates are unavailable. Refresh the page to try again.");
      } finally {
        if (!controller.signal.aborted) setTemplatesLoading(false);
      }
    }
    void loadTemplates();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const resultJson = result ? JSON.stringify(result, null, 2) : "";

  async function copyJson() {
    if (await copyText(resultJson)) setCopied(true);
    else setError("Could not copy to the clipboard.");
  }

  const selectedTemplate = templates.find(
    (template) => template.id === templateId,
  );

  function selectFile(nextFile: File | null) {
    setError("");
    setResult(null);
    if (
      nextFile &&
      !nextFile.type.startsWith("image/") &&
      !/\.(pdf|txt|json)$/i.test(nextFile.name)
    ) {
      setFile(null);
      setError("Choose a PDF, image, text, or JSON file.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    if (nextFile && nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("File must be 10 MB or smaller.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(nextFile);
  }

  async function extract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !templateId || extracting) return;
    setExtracting(true);
    setActiveView("results");
    setError("");
    setResult(null);
    const startedAt = performance.now();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("templateId", templateId);
    try {
      const response = await fetch(`${API_BASE}/file/extract`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error(await responseError(response));
      const data: Extraction = await response.json();
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new Error("Invalid extraction response");
      const remaining = MIN_LOADING_TIME - (performance.now() - startedAt);
      if (remaining > 0)
        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, remaining),
        );
      setResult(data);
      setActiveView("results");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Extraction failed");
      setActiveView("setup");
    } finally {
      setExtracting(false);
    }
  }

  return (
    <main className="page">
      <Header />

      <div className="page-content">
        <div className="intro">
          <h1>Find the details inside.</h1>
          <p>
            Turn a document into the information you need, in one clear view.
          </p>
        </div>

        <nav className="view-switch" aria-label="Workspace view">
          <button
            type="button"
            aria-pressed={activeView === "setup"}
            onClick={() => setActiveView("setup")}
          >
            Set up
          </button>
          <button
            type="button"
            aria-pressed={activeView === "results"}
            onClick={() => setActiveView("results")}
          >
            Results
            {selectedTemplate && !result && (
              <span className="view-switch-dot" aria-hidden="true" />
            )}
          </button>
        </nav>

        <div
          className={`workspace ${activeView === "results" ? "show-results" : "show-setup"}`}
        >
          <section className="setup-panel" aria-labelledby="setup-heading">
            <div className="panel-heading">
              <h2 id="setup-heading">Prepare your document</h2>
              <p>Add a file and choose the information to find.</p>
            </div>
            <form onSubmit={extract}>
              <div className="field-group">
                <label className="field-label" htmlFor="file-upload">
                  Your file
                </label>
                <div
                  className={`upload-area${file ? " has-file" : ""}${dragging ? " is-dragging" : ""}`}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(event.relatedTarget as Node)
                    )
                      setDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    if (!extracting)
                      selectFile(event.dataTransfer.files[0] ?? null);
                  }}
                >
                  <input
                    ref={fileInput}
                    id="file-upload"
                    type="file"
                    accept=".pdf,.txt,.json,image/*"
                    onChange={(event) =>
                      selectFile(event.target.files?.[0] ?? null)
                    }
                    disabled={extracting}
                  />
                  <div className="upload-icon" aria-hidden="true">
                    {file ? (
                      <svg viewBox="0 0 28 28" fill="none">
                        <circle cx="14" cy="14" r="12" fill="currentColor" />
                        <path
                          d="m8.5 14.2 3.6 3.6 7.5-7.6"
                          stroke="#fff"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 28 28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M8 3.75h8l5 5V23a1.25 1.25 0 0 1-1.25 1.25H8A1.25 1.25 0 0 1 6.75 23V5A1.25 1.25 0 0 1 8 3.75Z" />
                        <path d="M16 3.75V9h5M10 16h8m-8 3.5h5" />
                      </svg>
                    )}
                  </div>
                  <strong>
                    {file ? file.name : "Drop a file here or browse"}
                  </strong>
                  <span>
                    {file
                      ? `${readableFileSize(file.size)} · Choose another file to replace`
                      : "PDF, image, text or JSON · 10 MB maximum"}
                  </span>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="template">
                  Information to extract
                </label>
                <div className="select-wrap">
                  <select
                    id="template"
                    value={templateId}
                    onChange={(event) => {
                      setTemplateId(event.target.value);
                      setResult(null);
                      setError("");
                    }}
                    disabled={
                      templatesLoading || extracting || templates.length === 0
                    }
                    required
                  >
                    <option value="" disabled>
                      {templatesLoading
                        ? "Loading templates…"
                        : templates.length === 0
                          ? "No templates available"
                          : "Choose a template"}
                    </option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.templateName}
                      </option>
                    ))}
                  </select>
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
                    <path
                      d="m5 7.5 5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <button
                className={`extract-button${extracting ? " is-loading" : ""}`}
                type="submit"
                disabled={!file || !templateId || extracting}
                aria-busy={extracting}
              >
                {extracting ? "Extracting information…" : "Extract information"}
                {extracting ? (
                  <span className="button-spinner" aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">→</span>
                )}
              </button>
            </form>
          </section>

          <section className="result-panel" aria-labelledby="result-heading">
            <div className="panel-heading result-heading">
              <h2 id="result-heading">Your results</h2>
              <p>
                {result
                  ? "Your document has been processed."
                  : extracting
                    ? "Reading your document for the selected fields."
                    : selectedTemplate
                      ? "Review the fields this template will find."
                      : "Choose a template to preview what we can find."}
              </p>
            </div>
            {selectedTemplate && !extracting && !result && (
              <div
                className="template-preview"
                key={selectedTemplate.id}
                aria-live="polite"
              >
                <span className="template-preview-label">
                  Selected template
                </span>
                <h3>{selectedTemplate.templateName}</h3>
                <dl className="template-fields">
                  {Object.entries(selectedTemplate.properties).map(
                    ([field, property]) => (
                      <div key={field}>
                        <dt>{property.label || readableFieldName(field)}</dt>
                        {property.description && (
                          <dd>{property.description}</dd>
                        )}
                      </div>
                    ),
                  )}
                </dl>
              </div>
            )}
            {result ? (
              <div className="result-content" aria-live="polite">
                <div className="result-status">
                  <svg
                    className="status-check"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <circle cx="10" cy="10" r="9" fill="#ffb703" />
                    <path
                      d="m5.8 10.2 2.8 2.8 5.6-5.8"
                      fill="none"
                      stroke="#023047"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Extraction complete
                </div>
                <div className="result-toolbar">
                  <div
                    className="segmented"
                    role="group"
                    aria-label="Result format"
                  >
                    <button
                      type="button"
                      aria-pressed={resultMode === "fields"}
                      onClick={() => setResultMode("fields")}
                    >
                      Fields
                    </button>
                    <button
                      type="button"
                      aria-pressed={resultMode === "json"}
                      onClick={() => setResultMode("json")}
                    >
                      JSON
                    </button>
                  </div>
                  <button
                    type="button"
                    className={`secondary-button${copied ? " is-copied" : ""}`}
                    onClick={copyJson}
                  >
                    {copied ? "Copied ✓" : "Copy JSON"}
                  </button>
                </div>
                {resultMode === "json" ? (
                  <pre className="json-view" tabIndex={0}>
                    <code>{resultJson}</code>
                  </pre>
                ) : Object.keys(result).length > 0 ? (
                  <dl className="result-list">
                    {Object.entries(result).map(([field, value]) => (
                      <div className="result-row" key={field}>
                        <dt>{fieldLabel(selectedTemplate, field)}</dt>
                        <dd className={value === null ? "missing-value" : ""}>
                          {value ?? "Not found"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="empty-result">
                    No information was found in this file. Try another file or
                    template.
                  </p>
                )}
              </div>
            ) : (
              <div className="empty-state" aria-live="polite">
                <svg
                  className={`document-illustration${extracting ? " is-reading" : ""}`}
                  viewBox="0 0 112 136"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="18"
                    y="15"
                    width="88"
                    height="116"
                    rx="10"
                    fill="#d9eef6"
                  />
                  <path
                    d="M15 5h60l25 25v86a10 10 0 0 1-10 10H15a10 10 0 0 1-10-10V15A10 10 0 0 1 15 5Z"
                    fill="#fff"
                    stroke="#c7e2ed"
                  />
                  <path
                    d="M75 5v17a8 8 0 0 0 8 8h17"
                    fill="#f1f9fc"
                    stroke="#c7e2ed"
                  />
                  <path
                    d="M24 53h54M24 65h42M24 77h33"
                    stroke="#8ecae6"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <rect
                    x="24"
                    y="91"
                    width="55"
                    height="16"
                    rx="3"
                    fill="#fff7db"
                  />
                  <path
                    d="M25.5 92.5v13"
                    stroke="#ffb703"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <g className="scan-beam">
                    <rect
                      x="19"
                      y="42"
                      width="67"
                      height="12"
                      rx="6"
                      fill="#8ecae6"
                      fillOpacity=".45"
                    />
                    <path
                      d="M23 48h59"
                      stroke="#219ebc"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </g>
                </svg>
                <strong>
                  {extracting
                    ? "Reading your document…"
                    : selectedTemplate
                      ? "Ready to extract."
                      : "Your details, in focus."}
                </strong>
                <p>
                  {extracting
                    ? "This may take a moment."
                    : selectedTemplate
                      ? "Add a file, then extract information to see the values."
                      : "Choose a template and add a file to get started."}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;
