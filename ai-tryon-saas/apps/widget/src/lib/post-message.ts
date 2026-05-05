export type WidgetEventName =
  | "AI_TRYON_WIDGET_READY"
  | "AI_TRYON_PRODUCT_SELECTED"
  | "AI_TRYON_JOB_CREATED"
  | "AI_TRYON_JOB_COMPLETED"
  | "AI_TRYON_JOB_FAILED";

export type WidgetEventPayload = Record<string, unknown>;

export function postWidgetEvent(type: WidgetEventName, payload: WidgetEventPayload = {}) {
  if (typeof window === "undefined") return;

  window.parent?.postMessage(
    {
      type,
      payload,
      source: "ai-tryon-widget",
    },
    "*",
  );
}

export function createVisitorId() {
  if (typeof window === "undefined") return undefined;

  const storageKey = "ai_tryon_visitor_id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `visitor_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(storageKey, value);
  return value;
}
