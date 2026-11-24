export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string"
    ? body.error
    : `Request failed (${response.status})`;
}
