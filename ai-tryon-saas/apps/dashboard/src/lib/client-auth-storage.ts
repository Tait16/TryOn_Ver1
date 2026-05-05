import type { ClientAuthPayload } from "./client-auth-api";
import { api } from "./auth-api";

const KEY = "aitryon_client_auth";

export function saveClientAuth(payload: ClientAuthPayload): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({
      access_token: payload.access_token,
      user: payload.user,
      shop: payload.shop,
    }),
  );
  api.defaults.headers.common.Authorization = `Bearer ${payload.access_token}`;
}

export function readClientAuth():
  | { access_token: string; user: ClientAuthPayload["user"]; shop: ClientAuthPayload["shop"] }
  | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      access_token: string;
      user: ClientAuthPayload["user"];
      shop: ClientAuthPayload["shop"];
    };
  } catch {
    return null;
  }
}

export function clearClientAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  delete api.defaults.headers.common.Authorization;
}
