"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { forgotClientPassword, resetClientPassword } from "@/lib/client-auth-api";
import { formatApiError } from "@/lib/format-api-error";

function ForgetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestReset(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const data = await forgotClientPassword(email.trim().toLowerCase());
      setMessage(data.message);
    } catch (err: unknown) {
      setError(formatApiError(err, "Không gửi được email đặt lại mật khẩu."));
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (password.length < 8) {
      setError("Mật khẩu mới cần tối thiểu 8 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    setLoading(true);
    try {
      const data = await resetClientPassword(token, password);
      setMessage(data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(formatApiError(err, "Không đặt lại được mật khẩu."));
    } finally {
      setLoading(false);
    }
  }

  const isResetMode = Boolean(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-blue-950/30">
        <div className="mb-8">
          <Link href="/clients/login" className="text-sm text-blue-400 hover:text-blue-300">← Quay lại đăng nhập</Link>
          <div className="mt-6 inline-flex rounded-full bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200">
            Shop user password recovery
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            {isResetMode ? "Tạo mật khẩu mới" : "Quên mật khẩu?"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {isResetMode
              ? "Nhập mật khẩu mới cho tài khoản shop user của bạn."
              : "Nhập email trong bảng shop_users. Hệ thống sẽ gửi link đặt lại mật khẩu qua email."}
          </p>
        </div>

        {isResetMode ? (
          <form onSubmit={submitNewPassword} className="space-y-5">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">Mật khẩu mới</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Tối thiểu 8 ký tự"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-300">Xác nhận mật khẩu</label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="Nhập lại mật khẩu mới"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60">
              {loading ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
            </button>
          </form>
        ) : (
          <form onSubmit={requestReset} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">Email shop user</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                placeholder="owner@shop.com"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60">
              {loading ? "Đang gửi email..." : "Gửi link đặt lại mật khẩu"}
            </button>
          </form>
        )}

        {message ? <p className="mt-5 rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
        {error ? <p className="mt-5 rounded-2xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</p> : null}

        {!isResetMode ? (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs leading-5 text-slate-400">
            Nếu chưa cấu hình SMTP, backend sẽ in link reset ở terminal với prefix <span className="text-slate-200">[CLIENT_RESET_PASSWORD_LINK]</span>.
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function ClientForgetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 p-6 text-slate-100">Đang tải...</main>}>
      <ForgetPasswordContent />
    </Suspense>
  );
}
