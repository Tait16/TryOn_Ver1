"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/auth-api";
import { clearAuth, readAuth } from "@/lib/auth-storage";
import type { UserPublic } from "@/lib/auth-api";

const PAGE_SIZE_OPTIONS = [5, 10, 50, "all"] as const;

type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

type Shop = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
  created_at: string;
  updated_at: string;
};

type Product = {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type TryonJob = {
  id: string;
  shop_id: string;
  product_id: string;
  status: string;
  validation_status: string | null;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
};

type Plan = {
  id: string;
  code: string;
  name: string;
  monthly_price: string | number;
  included_tryons: number;
  overage_price: string | number | null;
  created_at: string;
};

type ShopSubscription = {
  id: string;
  shop_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
};

type DashboardData = {
  shops: Shop[];
  products: Product[];
  plans: Plan[];
  subscriptions: ShopSubscription[];
  tryonJobs: TryonJob[];
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [data, setData] = useState<DashboardData>({
    shops: [],
    products: [],
    plans: [],
    subscriptions: [],
    tryonJobs: [],
  });
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboardData() {
    setIsLoading(true);
    setError(null);

    try {
      const [
        shopsResponse,
        productsResponse,
        plansResponse,
        subscriptionsResponse,
        tryonJobsResponse,
      ] = await Promise.all([
        api.get<Shop[]>("/api/v1/shops", { params: { skip: 0, limit: 1000 } }),
        api.get<Product[]>("/api/v1/products", { params: { skip: 0, limit: 1000 } }),
        api.get<Plan[]>("/api/v1/plans", { params: { skip: 0, limit: 1000 } }),
        api.get<ShopSubscription[]>("/api/v1/shop-subscriptions", {
          params: { skip: 0, limit: 1000 },
        }),
        api.get<TryonJob[]>("/api/v1/tryon-jobs", {
          params: { skip: 0, limit: 1000 },
        }),
      ]);

      const nextData = {
        shops: shopsResponse.data,
        products: productsResponse.data,
        plans: plansResponse.data,
        subscriptions: subscriptionsResponse.data,
        tryonJobs: tryonJobsResponse.data,
      };

      setData(nextData);
      setSelectedShopId((currentId) => {
        if (currentId && nextData.shops.some((shop) => shop.id === currentId)) {
          return currentId;
        }
        return nextData.shops[0]?.id ?? null;
      });
    } catch (requestError) {
      console.error(requestError);
      setError(
        "Không tải được dữ liệu dashboard. Hãy kiểm tra API services/api đã chạy chưa.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const auth = readAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }

    setUser(auth.user);
    void loadDashboardData();
  }, [router]);

  const productsByShopId = useMemo(() => {
    return data.products.reduce<Record<string, Product[]>>((result, product) => {
      result[product.shop_id] = [...(result[product.shop_id] ?? []), product];
      return result;
    }, {});
  }, [data.products]);

  const tryonJobsByShopId = useMemo(() => {
    return data.tryonJobs.reduce<Record<string, TryonJob[]>>((result, job) => {
      result[job.shop_id] = [...(result[job.shop_id] ?? []), job];
      return result;
    }, {});

  }, [data.tryonJobs]);
  const plansById = useMemo(() => {
    return data.plans.reduce<Record<string, Plan>>((result, plan) => {
      result[plan.id] = plan;
      return result;
    }, {});
  }, [data.plans]);

  const plansByCode = useMemo(() => {
    return data.plans.reduce<Record<string, Plan>>((result, plan) => {
      result[normalizeText(plan.code)] = plan;
      return result;
    }, {});
  }, [data.plans]);

  const activeSubscriptionByShopId = useMemo(() => {
    return data.subscriptions.reduce<Record<string, ShopSubscription>>(
      (result, subscription) => {
        const current = result[subscription.shop_id];
        if (!current) {
          result[subscription.shop_id] = subscription;
          return result;
        }

        const currentTime = new Date(current.current_period_end).getTime();
        const nextTime = new Date(subscription.current_period_end).getTime();
        if (Number.isNaN(currentTime) || nextTime > currentTime) {
          result[subscription.shop_id] = subscription;
        }
        return result;
      },
      {},
    );
  }, [data.subscriptions]);

  const filteredShops = useMemo(() => {
    const keyword = normalizeText(search);
    if (!keyword) return data.shops;

    return data.shops.filter((shop) => {
      return (
        normalizeText(shop.name).includes(keyword) ||
        normalizeText(shop.domain).includes(keyword)
      );
    });
  }, [data.shops, search]);

  const totalPages = useMemo(() => {
    if (pageSize === "all") return 1;
    return Math.max(1, Math.ceil(filteredShops.length / pageSize));
  }, [filteredShops.length, pageSize]);

  const paginatedShops = useMemo(() => {
    if (pageSize === "all") return filteredShops;

    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredShops.slice(start, start + pageSize);
  }, [filteredShops, page, pageSize, totalPages]);

  const selectedShop = useMemo(() => {
    if (!selectedShopId) return filteredShops[0] ?? data.shops[0] ?? null;
    return data.shops.find((shop) => shop.id === selectedShopId) ?? null;
  }, [data.shops, filteredShops, selectedShopId]);

  const selectedSubscription = selectedShop
    ? activeSubscriptionByShopId[selectedShop.id]
    : undefined;

  const selectedPlan = selectedSubscription
    ? plansById[selectedSubscription.plan_id]
    : selectedShop
      ? plansByCode[normalizeText(selectedShop.plan)]
      : undefined;

  const selectedProducts = selectedShop
    ? productsByShopId[selectedShop.id] ?? []
    : [];

  const selectedTryonJobs = selectedShop
    ? tryonJobsByShopId[selectedShop.id] ?? []
    : [];

  const selectedBillableTryonJobs = selectedTryonJobs.filter((job) => job.is_billable);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  function logout() {
    clearAuth();
    router.replace("/login");
    router.refresh();
  }

  if (!user) {
    return <p className="p-10 text-center text-slate-400">Đang tải…</p>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
              Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
              Thống kê shop
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Xin chào {user.full_name || user.username}. Click vào từng shop để xem plan,
              chu kỳ hiện tại và số lượng sản phẩm.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={loadDashboardData}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              Tải lại dữ liệu
            </button>
            <button
              type="button"
              onClick={() => router.push("/Admin")}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
            >
              Admin CRUD
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-5">
          <StatCard label="Số lượng shop" value={formatNumber(data.shops.length)} />
          <StatCard label="Sản phẩm" value={formatNumber(data.products.length)} />
          <StatCard label="Tryons" value={formatNumber(data.tryonJobs.length)} />
          <StatCard label="Plans" value={formatNumber(data.plans.length)} />
          <StatCard
            label="Subscriptions"
            value={formatNumber(data.subscriptions.length)}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">List shop</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Đang hiển thị {formatNumber(paginatedShops.length)} /{" "}
                  {formatNumber(filteredShops.length)} shop phù hợp.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="sr-only" htmlFor="shop-search">
                  Tìm kiếm shop
                </label>
                <input
                  id="shop-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo tên shop hoặc domain..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 sm:w-72"
                />

                <select
                  value={String(pageSize)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPageSize(value === "all" ? "all" : (Number(value) as 5 | 10 | 50));
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white outline-none transition focus:border-cyan-400"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "All" : `${option} / trang`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-950/70 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Shop</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3 text-right">Sản phẩm</th>
                    <th className="px-4 py-3 text-right">Tryons</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        Đang tải dữ liệu...
                      </td>
                    </tr>
                  ) : paginatedShops.length > 0 ? (
                    paginatedShops.map((shop) => {
                      const isSelected = selectedShop?.id === shop.id;
                      const productCount = productsByShopId[shop.id]?.length ?? 0;
                      const tryonCount = tryonJobsByShopId[shop.id]?.length ?? 0;
                      const subscription = activeSubscriptionByShopId[shop.id];
                      const plan = subscription
                        ? plansById[subscription.plan_id]
                        : plansByCode[normalizeText(shop.plan)];

                      return (
                        <tr
                          key={shop.id}
                          onClick={() => setSelectedShopId(shop.id)}
                          className={`cursor-pointer transition hover:bg-cyan-400/10 ${isSelected ? "bg-cyan-400/10" : ""
                            }`}
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-white">{shop.name}</div>
                            <div className="mt-1 text-xs text-slate-500">{shop.id}</div>
                          </td>
                          <td className="px-4 py-4 text-slate-300">
                            {shop.domain || "—"}
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                              {plan?.name ?? shop.plan ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-slate-200">
                            {formatNumber(productCount)}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-200">
                            {formatNumber(tryonCount)}
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                              {shop.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        Không tìm thấy shop phù hợp.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Trang {pageSize === "all" ? 1 : Math.min(page, totalPages)} / {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pageSize === "all" || page <= 1}
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={pageSize === "all" || page >= totalPages}
                  onClick={() =>
                    setPage((currentPage) => Math.min(totalPages, currentPage + 1))
                  }
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30">
            <h2 className="text-lg font-semibold text-white">Thông tin shop</h2>

            {selectedShop ? (
              <div className="mt-5 space-y-5">
                <div className="rounded-2xl bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-400">
                    Selected shop
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-white">
                    {selectedShop.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedShop.domain || "Chưa có domain"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Số lượng shop" value={formatNumber(data.shops.length)} />
                  <InfoCard
                    label="Số lượng sản phẩm"
                    value={formatNumber(selectedProducts.length)}
                  />
                  <InfoCard
                    label="Số lượng tryons"
                    value={formatNumber(selectedTryonJobs.length)}
                  />
                  <InfoCard
                    label="Billable tryons"
                    value={formatNumber(selectedBillableTryonJobs.length)}
                  />
                  <InfoCard label="Plan" value={selectedPlan?.name ?? selectedShop.plan} />
                  <InfoCard
                    label="Included tryons"
                    value={
                      selectedPlan
                        ? formatNumber(selectedPlan.included_tryons)
                        : "—"
                    }
                  />
                </div>

                <dl className="space-y-3 rounded-2xl border border-slate-800 p-4 text-sm">
                  <InfoRow label="Shop ID" value={selectedShop.id} mono />
                  <InfoRow label="Status" value={selectedShop.status} />
                  <InfoRow
                    label="Plan code"
                    value={selectedPlan?.code ?? selectedShop.plan ?? "—"}
                  />
                  <InfoRow
                    label="Subscription status"
                    value={selectedSubscription?.status ?? "—"}
                  />
                  <InfoRow
                    label="Current period start"
                    value={formatDate(selectedSubscription?.current_period_start)}
                  />
                  <InfoRow
                    label="Current period end"
                    value={formatDate(selectedSubscription?.current_period_end)}
                  />
                  <InfoRow label="Ngày tạo" value={formatDate(selectedShop.created_at)} />
                  <InfoRow
                    label="Ngày cập nhật"
                    value={formatDate(selectedShop.updated_at)}
                  />
                </dl>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">
                      Sản phẩm của shop
                    </h3>
                    <span className="text-xs text-slate-500">
                      {formatNumber(selectedProducts.length)} items
                    </span>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {selectedProducts.length > 0 ? (
                      selectedProducts.slice(0, 20).map((product) => (
                        <div
                          key={product.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                        >
                          <p className="text-sm font-medium text-slate-100">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {product.category} · {product.status}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">
                        Shop này chưa có sản phẩm.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
                Chưa có shop để hiển thị.
              </p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/20">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-950/70 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-800 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd
        className={`break-words text-slate-200 ${mono ? "font-mono text-xs" : "text-sm"}`}
      >
        {value}
      </dd>
    </div>
  );
}
