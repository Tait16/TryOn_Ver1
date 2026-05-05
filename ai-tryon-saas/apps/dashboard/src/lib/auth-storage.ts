import type { AuthPayload } from "./auth-api";

const KEY = "aitryon_auth";

export function saveAuth(payload: AuthPayload): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      access_token: payload.access_token,
      user: payload.user,
    }),
  );
}

export function readAuth():
  | { access_token: string; user: AuthPayload["user"] }
  | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { access_token: string; user: AuthPayload["user"] };
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
