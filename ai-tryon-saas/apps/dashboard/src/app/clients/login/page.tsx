"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clientLoginRequest } from "@/lib/client-auth-api";
import { saveClientAuth } from "@/lib/client-auth-storage";
import { formatApiError } from "@/lib/format-api-error";

export default function ClientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await clientLoginRequest(email.trim().toLowerCase(), password);
      saveClientAuth(data);
      router.push("/clients/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(formatApiError(err, "Không đăng nhập được. Vui lòng kiểm tra email và mật khẩu."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              AI Try-On Client Portal
            </div>
            <h1 className="mt-10 max-w-xl text-5xl font-semibold leading-tight tracking-tight">
              Quản lý sản phẩm và theo dõi hiệu quả try-on của shop bạn.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-blue-100">
              Đăng nhập bằng tài khoản đã được cung cấp để xem dashboard riêng, thêm sản phẩm và quản lý hình ảnh sản phẩm của shop bạn.
            </p>
          </div>

          <div className="grid gap-4 rounded-3xl bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-sm text-blue-100">Theo dõi dữ liệu shop</span>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-100">Secure view</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-semibold">Plan</p>
                <p className="mt-1 text-xs text-blue-100">Xem gói plan đang sử dụng</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-semibold">Tryons</p>
                <p className="mt-1 text-xs text-blue-100">Xem số lượng try-on đã sử dụng</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-2xl font-semibold">Products</p>
                <p className="mt-1 text-xs text-blue-100">Xem số lượng sản phẩm của shop bạn</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-blue-950/30">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold">
                C
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight">Đăng nhập khách hàng</h2>
             
            </div>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@shop.com"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  required
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-300">Mật khẩu</label>
                  <Link href="/clients/forgetpassword" className="text-sm text-blue-400 hover:text-blue-300">Quên mật khẩu?</Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>

              {error ? <p className="rounded-2xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>

          
          </div>
        </section>
      </div>
    </main>
  );
}
