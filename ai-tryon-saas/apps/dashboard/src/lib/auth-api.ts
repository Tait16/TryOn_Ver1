import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

export type UserPublic = {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

export type AuthPayload = {
  access_token: string;
  token_type: string;
  user: UserPublic;
};

export async function loginRequest(
  username: string,
  password: string,
): Promise<AuthPayload> {
  const { data } = await api.post<AuthPayload>("/api/v1/auth/login", {
    username,
    password,
  });
  return data;
}

export async function registerRequest(body: {
  username: string;
  email: string;
  password: string;
  full_name?: string | null;
}): Promise<AuthPayload> {
  const { data } = await api.post<AuthPayload>("/api/v1/auth/register", body);
  return data;
}
