export function formatApiError(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object" || !("response" in err)) return fallback;
  const res = (err as { response?: { data?: unknown; status?: number } }).response;
  const status = res?.status;
  const data = res?.data;
  if (!data || typeof data !== "object" || !("detail" in data)) {
    if (typeof status === "number") {
      return `${fallback} (HTTP ${status})`;
    }
    return fallback;
  }
  const detail = (data as { detail: unknown }).detail;
  if (typeof detail === "string") {
    return typeof status === "number" ? `[${status}] ${detail}` : detail;
  }
  if (Array.isArray(detail)) {
    const body = detail
      .map((item) =>
        typeof item === "object" && item && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : JSON.stringify(item),
      )
      .join("; ");
    return typeof status === "number" ? `[${status}] ${body}` : body;
  }
  return typeof status === "number" ? `${fallback} (HTTP ${status})` : fallback;
}
