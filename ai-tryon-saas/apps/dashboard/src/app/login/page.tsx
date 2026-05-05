"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginRequest } from "@/lib/auth-api";
import { saveAuth } from "@/lib/auth-storage";
import { formatApiError } from "@/lib/format-api-error";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginRequest(username.trim(), password);
      saveAuth(data);
      router.push("/Admin");
      router.refresh();
    } catch (err: unknown) {
      setError(
        formatApiError(
          err,
          "Không đăng nhập được. Kiểm tra API và tài khoản.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700/80 p-8 shadow-xl"
        style={{ background: "var(--card)" }}
      >
        <h1 className="text-center text-2xl font-semibold tracking-tight">
          Đăng nhập
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          AI Try-On — tài khoản hệ thống
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Tên đăng nhập
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-slate-100 outline-none ring-blue-500/50 focus:ring-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-slate-100 outline-none ring-blue-500/50 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Đang xử lý…" : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-blue-400 hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </main>
  );
}
