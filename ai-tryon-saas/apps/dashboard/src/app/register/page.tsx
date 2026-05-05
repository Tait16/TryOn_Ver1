"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerRequest } from "@/lib/auth-api";
import { saveAuth } from "@/lib/auth-storage";
import { formatApiError } from "@/lib/format-api-error";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await registerRequest({
        username: username.trim(),
        email: email.trim(),
        password,
        full_name: fullName.trim() || null,
      });
      saveAuth(data);
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(formatApiError(err, "Đăng ký thất bại."));
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
          Đăng ký
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Mật khẩu tối thiểu 8 ký tự — server mã hóa bcrypt
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Tên đăng nhập
            </label>
            <input
              className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 outline-none ring-blue-500/50 focus:ring-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={2}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 outline-none ring-blue-500/50 focus:ring-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Họ tên (tuỳ chọn)
            </label>
            <input
              className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 outline-none ring-blue-500/50 focus:ring-2"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">
              Mật khẩu
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 outline-none ring-blue-500/50 focus:ring-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
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
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
