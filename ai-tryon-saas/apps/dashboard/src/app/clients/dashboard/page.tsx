"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/auth-api";
import { clearClientAuth, readClientAuth } from "@/lib/client-auth-storage";
import { createProductAsset, deleteProductAsset, fetchShopWidgetSettings, saveShopWidgetSettings, updateProduct, updateProductAsset } from "@/lib/client-auth-api";
import type { ClientShop, ClientShopUser, Plan, Product, ProductAsset, ShopSubscription, ShopWidgetSettings, TryonJob } from "@/lib/client-auth-api";
import { formatApiError } from "@/lib/format-api-error";


type ClientSession = {
  access_token: string;
  user: ClientShopUser;
  shop: ClientShop;
};

type WidgetEvent = {
  id: string;
  shop_id?: string | null;
  product_id?: string | null;
  event_name?: string | null;
  event_type?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type DashboardData = {
  products: Product[];
  assets: ProductAsset[];
  plans: Plan[];
  subscriptions: ShopSubscription[];
  tryonJobs: TryonJob[];
};

type TopTryonProductRow = {
  rank: number;
  product: Product;
  tryonCount: number;
  billableCount: number;
  completedCount: number;
  failedCount: number;
  latestTryonAt: string | null;
};

type DashboardTab = "overview" | "products" | "analytics" | "tryonInsights" | "widgetSettings";

type ProductSortKey = "name" | "category" | "price" | "imageCount" | "status" | "createdAt" | "updatedAt";
type SortDirection = "asc" | "desc";

type IconName =
  | "home"
  | "box"
  | "chart"
  | "sparkles"
  | "widget"
  | "shirt"
  | "clock"
  | "wallet"
  | "heart"
  | "shield"
  | "search"
  | "warning"
  | "check"
  | "x"
  | "edit"
  | "eye"
  | "trash"
  | "plus"
  | "calendar"
  | "image"
  | "activity";

const dashboardTabs: { id: DashboardTab; label: string; description: string; icon: IconName }[] = [
  { id: "overview", label: "Overview", description: "Tổng quan shop", icon: "home" },
  { id: "products", label: "Products", description: "Quản lý sản phẩm", icon: "box" },
  { id: "analytics", label: "Widget Health", description: "Tình trạng widget & ảnh", icon: "shield" },
  { id: "tryonInsights", label: "Try-on Insights", description: "Cơ hội từ lượt mặc thử", icon: "sparkles" },
  { id: "widgetSettings", label: "Widget Settings", description: "Branding & giao diện", icon: "widget" },
];

type DailyTryonRow = {
  dateKey: string;
  label: string;
  total: number;
  billable: number;
  completed: number;
  failed: number;
  processing: number;
};

type ProductConversionRow = {
  rank: number;
  product: Product;
  tryonCount: number;
  buyClickCount: number;
  conversionRate: number;
  potentialValue: number;
};


type SalesRecommendation = {
  id: string;
  title: string;
  description: string;
  tone: "success" | "warning" | "danger" | "info";
};

type ProductImageWarningRow = {
  product: Product;
  issue: string;
  severity: "warning" | "danger";
};

type ProductFormState = {
  external_product_id: string;
  name: string;
  category: string;
  price: string;
  currency: string;
  product_url: string;
  status: string;
  newImageUrls: string;
};

type ProductAssetFormState = {
  id: string;
  original_image_url: string;
  thumbnail_url: string;
  processed_image_url: string;
  mask_image_url: string;
  status: string;
  error_message: string;
  markedForDeletion: boolean;
};

type WidgetSettingsFormState = {
  logo_url: string;
  cover_image_url: string;
  fallback_product_image_url: string;
  primary_color: string;
  button_color: string;
  background_color: string;
  text_color: string;
  headline: string;
  subheadline: string;
  tryon_button_text: string;
  buy_button_text: string;
  show_price: boolean;
  show_buy_button: boolean;
  default_product_sort: "latest" | "most_tryon" | "price_asc" | "price_desc" | "name_asc";
};

const customCategoryValue = "__custom_category__";

const defaultWidgetSettingsForm: WidgetSettingsFormState = {
  logo_url: "",
  cover_image_url: "",
  fallback_product_image_url: "",
  primary_color: "#2563EB",
  button_color: "#111827",
  background_color: "#FFFFFF",
  text_color: "#0F172A",
  headline: "Thử đồ AI trước khi mua",
  subheadline: "Upload ảnh của bạn và xem sản phẩm phù hợp thế nào",
  tryon_button_text: "Thử đồ AI",
  buy_button_text: "Mua ngay",
  show_price: true,
  show_buy_button: true,
  default_product_sort: "latest",
};

function widgetSettingsToForm(settings: ShopWidgetSettings | null): WidgetSettingsFormState {
  if (!settings) return defaultWidgetSettingsForm;

  return {
    logo_url: settings.logo_url ?? "",
    cover_image_url: settings.cover_image_url ?? "",
    fallback_product_image_url: settings.fallback_product_image_url ?? "",
    primary_color: settings.primary_color || defaultWidgetSettingsForm.primary_color,
    button_color: settings.button_color || defaultWidgetSettingsForm.button_color,
    background_color: settings.background_color || defaultWidgetSettingsForm.background_color,
    text_color: settings.text_color || defaultWidgetSettingsForm.text_color,
    headline: settings.headline || defaultWidgetSettingsForm.headline,
    subheadline: settings.subheadline || defaultWidgetSettingsForm.subheadline,
    tryon_button_text: settings.tryon_button_text || defaultWidgetSettingsForm.tryon_button_text,
    buy_button_text: settings.buy_button_text || defaultWidgetSettingsForm.buy_button_text,
    show_price: settings.show_price,
    show_buy_button: settings.show_buy_button,
    default_product_sort: ["latest", "most_tryon", "price_asc", "price_desc", "name_asc"].includes(settings.default_product_sort)
      ? (settings.default_product_sort as WidgetSettingsFormState["default_product_sort"])
      : "latest",
  };
}

function productToForm(product: Product): ProductFormState {
  return {
    external_product_id: product.external_product_id ?? "",
    name: product.name ?? "",
    category: product.category ?? "",
    price: product.price === null || product.price === undefined ? "" : String(product.price),
    currency: product.currency ?? "VND",
    product_url: product.product_url ?? "",
    status: product.status ?? "active",
    newImageUrls: "",
  };
}

function assetToForm(asset: ProductAsset): ProductAssetFormState {
  return {
    id: asset.id,
    original_image_url: asset.original_image_url ?? "",
    thumbnail_url: asset.thumbnail_url ?? "",
    processed_image_url: asset.processed_image_url ?? "",
    mask_image_url: asset.mask_image_url ?? "",
    status: asset.status ?? "uploaded",
    error_message: asset.error_message ?? "",
    markedForDeletion: false,
  };
}

function splitImageUrls(value: string) {
  return value
    .split(/\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function normalizeImageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(date);
}
function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
function getProductCreatedAt(product: Product) {
  return (product as Product & { created_at?: string | null; createdAt?: string | null }).created_at
    ?? (product as Product & { created_at?: string | null; createdAt?: string | null }).createdAt
    ?? null;
}

function getProductUpdatedAt(product: Product) {
  return (product as Product & { updated_at?: string | null; updatedAt?: string | null }).updated_at
    ?? (product as Product & { updated_at?: string | null; updatedAt?: string | null }).updatedAt
    ?? null;
}

function getDateTimeValue(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareText(a?: string | null, b?: string | null) {
  return String(a ?? "").localeCompare(String(b ?? ""), "vi", { sensitivity: "base", numeric: true });
}

function money(value?: number | string | null, currency = "VND") {
  const numberValue = Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(Number.isFinite(numberValue) ? numberValue : 0);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value)}%`;
}


function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, JSX.Element> = {
    home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10.5V20h14v-9.5" /><path d="M9 20v-6h6v6" /></>,
    box: <><path d="m21 8-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-7" /></>,
    sparkles: <><path d="M12 3l1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8-4.8-1.7 4.8-1.7L12 3Z" /><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" /></>,
    widget: <><path d="M4 4h7v7H4z" /><path d="M13 4h7v7h-7z" /><path d="M4 13h7v7H4z" /><path d="M13 13h7v7h-7z" /></>,
    shirt: <><path d="M9 4 7 5 4 7l2 4 2-1v10h8V10l2 1 2-4-3-2-2-1" /><path d="M9 4c.6 1.2 1.6 2 3 2s2.4-.8 3-2" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    wallet: <><path d="M4 7h15a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h13" /><path d="M16 13h5" /></>,
    heart: <><path d="M20.8 8.6a5.2 5.2 0 0 0-8.8-3.2 5.2 5.2 0 0 0-8.8 3.2c0 5.4 8.8 10.4 8.8 10.4s8.8-5 8.8-10.4Z" /></>,
    shield: <><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    warning: <><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v5" /><path d="M12 17h.01" /></>,
    check: <><path d="M20 6 9 17l-5-5" /></>,
    x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    calendar: <><path d="M7 3v4" /><path d="M17 3v4" /><path d="M4 8h16" /><path d="M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z" /></>,
    image: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="10" r="1.5" /><path d="m21 16-5-5L5 19" /></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function SectionTitle({ icon, title, description, badge }: { icon: IconName; title: string; description?: string; badge?: string }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="flex items-start gap-3">
        <span className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-2 text-blue-300">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
        </div>
      </div>
      {badge ? <span className="w-fit rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">{badge}</span> : null}
    </div>
  );
}

function getProductPriceValue(product: Product) {
  const value = Number(product.price ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getEventName(event: WidgetEvent) {
  return (event.event_name || event.event_type || "").toLowerCase();
}


function toDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function StatCard({ label, value, helper, icon }: { label: string; value: string; helper?: string; icon?: IconName }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/20">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        {icon ? (
          <span className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-2 text-blue-300">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {helper ? <p className="mt-2 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}


function OverviewTryonColumnChart({ rows }: { rows: DailyTryonRow[] }) {
  const chartRows = [...rows].reverse();
  const maxValue = Math.max(...chartRows.map((row) => row.total), 1);
  const totalTryons = chartRows.reduce((sum, row) => sum + row.total, 0);
  const completedTryons = chartRows.reduce((sum, row) => sum + row.completed, 0);
  const failedTryons = chartRows.reduce((sum, row) => sum + row.failed, 0);
  const averagePerDay = chartRows.length ? totalTryons / chartRows.length : 0;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-950/20">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-2 text-cyan-300">
            <Icon name="chart" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Lượt truy cập thử đồ AI</h2>
            <p className="mt-1 text-sm text-slate-400">
              Biểu đồ cột dọc theo số lượt try-on trong 7 ngày gần nhất.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <p className="text-xs text-slate-500">Tổng 7 ngày</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatNumber(totalTryons)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <p className="text-xs text-slate-500">Hoàn thành</p>
            <p className="mt-1 text-xl font-semibold text-emerald-300">{formatNumber(completedTryons)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <p className="text-xs text-slate-500">Thất bại</p>
            <p className="mt-1 text-xl font-semibold text-red-300">{formatNumber(failedTryons)}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
        <div className="flex h-64 items-end justify-between gap-3">
          {chartRows.map((row) => {
            const totalHeight = row.total > 0 ? Math.max((row.total / maxValue) * 100, 6) : 0;
            const completedHeight = row.total ? (row.completed / row.total) * 100 : 0;
            const processingHeight = row.total ? (row.processing / row.total) * 100 : 0;
            const failedHeight = row.total ? (row.failed / row.total) * 100 : 0;

            return (
              <div key={row.dateKey} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-3">
                <div className="flex h-full w-full items-end justify-center">
                  <div className="flex h-full w-full max-w-[56px] items-end">
                    {row.total > 0 ? (
                      <div
                        className="group relative flex w-full flex-col-reverse overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-800 shadow-lg shadow-slate-950/30 transition hover:border-blue-400"
                        style={{ height: `${totalHeight}%` }}
                      >
                        <div className="bg-emerald-400" style={{ height: `${completedHeight}%` }} title={`Hoàn thành: ${row.completed}`} />
                        <div className="bg-amber-400" style={{ height: `${processingHeight}%` }} title={`Đang xử lý: ${row.processing}`} />
                        <div className="bg-red-400" style={{ height: `${failedHeight}%` }} title={`Thất bại: ${row.failed}`} />

                        <div className="pointer-events-none absolute -top-10 left-1/2 hidden -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-xl group-hover:block">
                          {formatNumber(row.total)} lượt
                        </div>
                      </div>
                    ) : (
                      <div className="h-2 w-full max-w-[56px] rounded-full bg-slate-800" />
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-300">{formatNumber(row.total)}</p>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{row.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span>Hoàn thành</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span>Đang xử lý</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span>Thất bại</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Trung bình: <span className="font-semibold text-slate-300">{formatNumber(Math.round(averagePerDay))}</span> lượt/ngày
          </p>
        </div>
      </div>
    </section>
  );
}


function DashboardTabs({ activeTab, onChange }: { activeTab: DashboardTab; onChange: (tab: DashboardTab) => void }) {
  return (
    <nav className="mt-6 overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/80 p-2 shadow-lg shadow-slate-950/20">
      <div className="flex min-w-max gap-2">
        {dashboardTabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
              ].join(" ")}
            >
              <span className={active ? "rounded-xl bg-white/15 p-2 text-white" : "rounded-xl bg-slate-800 p-2 text-slate-400"}>
                <Icon name={tab.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span className={active ? "mt-1 block text-xs text-blue-100" : "mt-1 block text-xs text-slate-500"}>
                  {tab.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ProductSortButton({
  label,
  sortKey,
  activeSortKey,
  direction,
  align = "left",
  onSort,
}: {
  label: string;
  sortKey: ProductSortKey;
  activeSortKey: ProductSortKey;
  direction: SortDirection;
  align?: "left" | "right";
  onSort: (key: ProductSortKey) => void;
}) {
  const active = activeSortKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={[
        "inline-flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition hover:text-slate-200",
        align === "right" ? "justify-end text-right" : "justify-start text-left",
        active ? "text-blue-300" : "text-slate-500",
      ].join(" ")}
      title={`Sort theo ${label}`}
    >
      <span>{label}</span>
      <span className={active ? "text-blue-300" : "text-slate-600"}>
        {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
      </span>
    </button>
  );
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [data, setData] = useState<DashboardData>({ products: [], assets: [], plans: [], subscriptions: [], tryonJobs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productMessage, setProductMessage] = useState<string | null>(null);
  const [successPopupMessage, setSuccessPopupMessage] = useState<string | null>(null);
  const [widgetSettings, setWidgetSettings] = useState<ShopWidgetSettings | null>(null);
  const [widgetSettingsForm, setWidgetSettingsForm] = useState<WidgetSettingsFormState>(defaultWidgetSettingsForm);
  const [savingWidgetSettings, setSavingWidgetSettings] = useState(false);
  const [widgetSettingsMessage, setWidgetSettingsMessage] = useState<string | null>(null);
  const [topTryonSearch, setTopTryonSearch] = useState("");
  const [topTryonCategoryFilter, setTopTryonCategoryFilter] = useState("all");
  const [topTryonPage, setTopTryonPage] = useState(1);
  const [topTryonPageSize, setTopTryonPageSize] = useState<"5" | "10" | "20" | "50" | "all">("5");
  const [assetFormRows, setAssetFormRows] = useState<ProductAssetFormState[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productStatusFilter, setProductStatusFilter] = useState("all");
  const [productSortKey, setProductSortKey] = useState<ProductSortKey>("createdAt");
  const [productSortDirection, setProductSortDirection] = useState<SortDirection>("desc");
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState<"5" | "10" | "20" | "50" | "all">("5");
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>("overview");
  useEffect(() => {
    const auth = readClientAuth();
    if (!auth) {
      router.replace("/clients/login");
      return;
    }
    setSession(auth);
  }, [router]);

  useEffect(() => {
    if (!session) return;
    const currentSession = session;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [productsResponse, assetsResponse, plansResponse, subscriptionsResponse, tryonJobsResponse, widgetSettingsResponse] = await Promise.all([
          api.get<Product[]>("/api/v1/products", { params: { skip: 0, limit: 1000 } }),
          api.get<ProductAsset[]>("/api/v1/product-assets", { params: { skip: 0, limit: 1000 } }),
          api.get<Plan[]>("/api/v1/plans", { params: { skip: 0, limit: 1000 } }),
          api.get<ShopSubscription[]>("/api/v1/shop-subscriptions", { params: { skip: 0, limit: 1000 } }),
          api.get<TryonJob[]>("/api/v1/tryon-jobs", { params: { skip: 0, limit: 1000 } }),
          fetchShopWidgetSettings().catch(() => null),
        ]);

        const shopId = currentSession.shop.id;
        const shopProducts = productsResponse.data.filter(
          // Hiển thị tất cả sản phẩm của shop, bao gồm cả draft.
          // Chỉ ẩn sản phẩm đã soft-delete.
          (product) => product.shop_id === shopId && product.status !== "deleted",
        );
        const productIds = new Set(shopProducts.map((product) => product.id));

        setData({
          products: shopProducts,
          assets: assetsResponse.data.filter((asset) => productIds.has(asset.product_id)),
          plans: plansResponse.data,
          subscriptions: subscriptionsResponse.data.filter((sub) => sub.shop_id === shopId),
          tryonJobs: tryonJobsResponse.data.filter((job) => job.shop_id === shopId),
        });

        if (widgetSettingsResponse) {
          setWidgetSettings(widgetSettingsResponse);
          setWidgetSettingsForm(widgetSettingsToForm(widgetSettingsResponse));
        }
      } catch (err: unknown) {
        setError(formatApiError(err, "Không tải được dữ liệu dashboard client."));
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, [session]);

  const activeSubscription = useMemo(() => {
    return data.subscriptions.find((sub) => sub.status === "active") ?? data.subscriptions[0] ?? null;
  }, [data.subscriptions]);

  const currentPlan = useMemo(() => {
    if (!activeSubscription) return data.plans.find((plan) => plan.code === session?.shop.plan) ?? null;
    return data.plans.find((plan) => plan.id === activeSubscription.plan_id) ?? null;
  }, [activeSubscription, data.plans, session?.shop.plan]);
  const isShopOwner = ["owner", "shop_owner", "admin"].includes(session?.user.role ?? "");
  const isShopEmployee = session?.user.role === "employee";

  const widgetBaseUrl =
    process.env.NEXT_PUBLIC_WIDGET_BASE_URL ||
    (typeof window !== "undefined" ? window.location.origin.replace(":3000", ":3001") : "");

  const shopRef =
    (session?.shop as ClientShop & { shop_ref?: string | null })?.shop_ref ||
    session?.shop?.domain ||
    session?.shop?.id ||
    "";

  const widgetPublicUrl = shopRef
    ? `${widgetBaseUrl}/widget/tryon?shop_ref=${encodeURIComponent(shopRef)}`
    : "";

  const widgetEmbedCode = widgetPublicUrl
    ? `<iframe
    src="${widgetPublicUrl}"
    width="100%"
    height="760"
    style="border:0;border-radius:24px;overflow:hidden;"
    allow="camera; clipboard-write"
    loading="lazy"
  ></iframe>`
    : "";
    const widgetResponsiveEmbedCode = widgetPublicUrl
    ? `<div style="width:100%;max-width:1200px;margin:0 auto;">
    <div style="position:relative;width:100%;height:min(86vh,820px);min-height:620px;border-radius:24px;overflow:hidden;">
      <iframe
        src="${widgetPublicUrl}"
        title="AI Try-On Widget"
        style="position:absolute;inset:0;width:100%;height:100%;border:0;"
        allow="camera; clipboard-write"
        loading="lazy"
      ></iframe>
    </div>
  </div>`
    : "";

  const widgetPopupEmbedCode = widgetPublicUrl
    ? `<button
    onclick="document.getElementById('ai-tryon-widget-modal').style.display='flex'"
    style="padding:12px 20px;border:0;border-radius:999px;background:#2563eb;color:white;font-weight:700;cursor:pointer;"
  >
    Thử đồ AI
  </button>
  
  <div
    id="ai-tryon-widget-modal"
    style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.72);align-items:center;justify-content:center;padding:20px;"
  >
    <div style="position:relative;width:100%;max-width:1100px;height:86vh;background:white;border-radius:24px;overflow:hidden;">
      <button
        onclick="document.getElementById('ai-tryon-widget-modal').style.display='none'"
        style="position:absolute;top:12px;right:12px;z-index:2;width:36px;height:36px;border:0;border-radius:999px;background:#111827;color:white;cursor:pointer;"
      >
        ×
      </button>
      <iframe
        src="${widgetPublicUrl}"
        width="100%"
        height="100%"
        style="border:0;"
        allow="camera; clipboard-write"
      ></iframe>
    </div>
  </div>`
    : "";

  const widgetFloatingButtonEmbedCode = widgetPublicUrl
    ? `<a
    href="${widgetPublicUrl}"
    target="_blank"
    rel="noopener noreferrer"
    style="position:fixed;right:20px;bottom:20px;z-index:9999;padding:14px 20px;border-radius:999px;background:#2563eb;color:white;text-decoration:none;font-weight:700;box-shadow:0 10px 30px rgba(37,99,235,.35);"
  >
    Thử đồ AI
  </a>`
    : "";

  const billableTryons = data.tryonJobs.filter((job) => job.is_billable).length;
  const includedTryons = currentPlan?.included_tryons ?? 0;
  const remainingTryons = Math.max(includedTryons - billableTryons, 0);

  const assetsByProductId = useMemo(() => {
    return data.assets.reduce<Record<string, ProductAsset[]>>((result, asset) => {
      result[asset.product_id] = [...(result[asset.product_id] ?? []), asset];
      return result;
    }, {});
  }, [data.assets]);

  const productMapById = useMemo(() => {
    return new Map(data.products.map((product) => [product.id, product]));
  }, [data.products]);


  const categoryOptions = useMemo(() => {
    const fromProducts = data.products
      .map((product) => product.category?.trim())
      .filter((category): category is string => Boolean(category));
    return Array.from(new Set(fromProducts)).sort((a, b) => a.localeCompare(b));
  }, [data.products]);

  const productStatusOptions = useMemo(() => {
    const statuses = data.products
      .map((product) => product.status?.trim())
      .filter((status): status is string => Boolean(status));

    return Array.from(new Set(statuses)).sort((a, b) => a.localeCompare(b));
  }, [data.products]);


  const tryonCountsByProductId = useMemo(() => {
    return data.tryonJobs.reduce<Record<string, number>>((result, job) => {
      result[job.product_id] = (result[job.product_id] ?? 0) + 1;
      return result;
    }, {});
  }, [data.tryonJobs]);

  const completedTryons = data.tryonJobs.filter((job) => job.status === "completed").length;
  const failedTryons = data.tryonJobs.filter((job) => job.status === "failed").length;
  const processingTryons = Math.max(data.tryonJobs.length - completedTryons - failedTryons, 0);
  const potentialInterestValue = useMemo(() => {
    return data.tryonJobs.reduce((total, job) => {
      const product = productMapById.get(job.product_id);
      return total + (product ? getProductPriceValue(product) : 0);
    }, 0);
  }, [data.tryonJobs, productMapById]);

  const dailyTryonRows = useMemo<DailyTryonRow[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - index);
      const dateKey = toDateKey(date);
      const jobs = data.tryonJobs.filter((job) => toDateKey(job.created_at) === dateKey);

      return {
        dateKey,
        label: new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" }).format(date),
        total: jobs.length,
        billable: jobs.filter((job) => job.is_billable).length,
        completed: jobs.filter((job) => job.status === "completed").length,
        failed: jobs.filter((job) => job.status === "failed").length,
        processing: jobs.filter((job) => !["completed", "failed"].includes(job.status)).length,
      };
    });
  }, [data.tryonJobs]);

  const sevenDayBillableTryons = dailyTryonRows.reduce((total, row) => total + row.billable, 0);
  const averageDailyBillableTryons = sevenDayBillableTryons / 7;
  const quotaForecastDays = averageDailyBillableTryons > 0 && remainingTryons > 0 ? Math.ceil(remainingTryons / averageDailyBillableTryons) : null;

  const productTryonInsightRows = useMemo<ProductConversionRow[]>(() => {
    return data.products
      .map((product) => {
        const tryonCount = tryonCountsByProductId[product.id] ?? 0;
        return {
          product,
          tryonCount,
          buyClickCount: 0,
          conversionRate: 0,
          potentialValue: tryonCount * getProductPriceValue(product),
        };
      })
      .filter((row) => row.tryonCount > 0)
      .sort((a, b) => {
        if (b.tryonCount !== a.tryonCount) return b.tryonCount - a.tryonCount;
        return b.potentialValue - a.potentialValue;
      })
      .map((row, index) => ({ rank: index + 1, ...row }));
  }, [data.products, tryonCountsByProductId]);

  const topTryonInterestProduct = productTryonInsightRows[0] ?? null;
  const averageTryonsPerProduct = data.products.length > 0 ? data.tryonJobs.length / data.products.length : 0;

  const highInterestProducts = useMemo(() => {
    const threshold = Math.max(3, Math.ceil(averageTryonsPerProduct));
    return productTryonInsightRows.filter((row) => row.tryonCount >= threshold).slice(0, 6);
  }, [averageTryonsPerProduct, productTryonInsightRows]);

  const lowExposureProducts = useMemo(() => {
    const maxLowTryons = Math.max(1, Math.floor(Math.max(averageTryonsPerProduct, 1) * 0.5));
    return data.products
      .map((product) => ({
        product,
        tryonCount: tryonCountsByProductId[product.id] ?? 0,
        buyClickCount: 0,
        conversionRate: 0,
        potentialValue: (tryonCountsByProductId[product.id] ?? 0) * getProductPriceValue(product),
      }))
      .filter((row) => row.tryonCount <= maxLowTryons)
      .sort((a, b) => {
        if (a.tryonCount !== b.tryonCount) return a.tryonCount - b.tryonCount;
        return getProductPriceValue(b.product) - getProductPriceValue(a.product);
      })
      .slice(0, 6)
      .map((row, index) => ({ rank: index + 1, ...row }));
  }, [averageTryonsPerProduct, data.products, tryonCountsByProductId]);

  const tryonRecommendations = useMemo<SalesRecommendation[]>(() => {
    const recommendations: SalesRecommendation[] = [];

    if (topTryonInterestProduct) {
      recommendations.push({
        id: "promote-top-tryon-product",
        title: `Đẩy mạnh ${topTryonInterestProduct.product.name}`,
        description: `Sản phẩm này có ${formatNumber(topTryonInterestProduct.tryonCount)} lượt mặc thử. Nên đưa lên đầu widget hoặc dùng làm sản phẩm nổi bật trong campaign.`,
        tone: "success",
      });
    }

    const lowExposure = lowExposureProducts[0];
    if (lowExposure) {
      recommendations.push({
        id: "increase-low-exposure-product",
        title: `Tăng hiển thị ${lowExposure.product.name}`,
        description: `Sản phẩm này mới có ${formatNumber(lowExposure.tryonCount)} lượt mặc thử. Hãy thử đổi ảnh, đưa lên đầu danh sách hoặc gắn vào bài social.`,
        tone: "info",
      });
    }

    if (quotaForecastDays !== null && quotaForecastDays <= 7) {
      recommendations.push({
        id: "quota-warning",
        title: "Quota có thể sắp hết",
        description: `Với tốc độ hiện tại, quota có thể hết sau khoảng ${quotaForecastDays} ngày. Nên cân nhắc nâng plan trước campaign mới.`,
        tone: "warning",
      });
    }

    if (data.tryonJobs.length === 0) {
      recommendations.push({
        id: "no-tryon-data",
        title: "Chưa có dữ liệu mặc thử",
        description: "Hãy kiểm tra widget public và đảm bảo sản phẩm có ảnh public để khách có thể bắt đầu thử đồ.",
        tone: "warning",
      });
    }

    return recommendations.slice(0, 4);
  }, [data.tryonJobs.length, lowExposureProducts, quotaForecastDays, topTryonInterestProduct]);

  const imageWarningProducts = useMemo<ProductImageWarningRow[]>(() => {
    return data.products.flatMap<ProductImageWarningRow>((product) => {
      const assets = assetsByProductId[product.id] ?? [];
      const hasUsableImage = assets.some((asset) => getAssetPreviewUrl(asset));
      const hasFailedAsset = assets.some((asset) => asset.status === "failed" || Boolean(asset.error_message));

      if (!assets.length || !hasUsableImage) {
        return [{ product, issue: "Thiếu ảnh public cho widget", severity: "danger" as const }];
      }

      if (hasFailedAsset) {
        return [{ product, issue: "Có ảnh lỗi hoặc asset failed", severity: "warning" as const }];
      }

      return [];
    });
  }, [assetsByProductId, data.products]);

  const productsWithoutTryon = useMemo(() => {
    return data.products.filter((product) => !tryonCountsByProductId[product.id]);
  }, [data.products, tryonCountsByProductId]);

  const publicVisibleProducts = data.products.filter((product) => product.status === "active" && (assetsByProductId[product.id] ?? []).some((asset) => getAssetPreviewUrl(asset)));
  const widgetHealthStatus = session?.shop.status === "active" && publicVisibleProducts.length > 0 ? "Hoạt động" : "Cần kiểm tra";

  const viewingProductAssets = viewingProduct ? assetsByProductId[viewingProduct.id] ?? [] : [];
  const editingProductAssets = editingProduct ? assetsByProductId[editingProduct.id] ?? [] : [];
  const filteredProducts = useMemo(() => {
    const keyword = productSearch.trim().toLowerCase();

    return data.products.filter((product) => {
      if (productCategoryFilter !== "all" && product.category !== productCategoryFilter) {
        return false;
      }

      if (productStatusFilter !== "all" && product.status !== productStatusFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const productAssets = assetsByProductId[product.id] ?? [];
      const hasImage = productAssets.length > 0 ? "có ảnh" : "không ảnh";

      return [
        product.name,
        product.external_product_id,
        product.status,
        product.product_url,
        product.currency,
        String(product.price ?? ""),
        hasImage,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [assetsByProductId, data.products, productCategoryFilter, productSearch, productStatusFilter]);

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const directionMultiplier = productSortDirection === "asc" ? 1 : -1;
      const assetCountA = assetsByProductId[a.id]?.length ?? 0;
      const assetCountB = assetsByProductId[b.id]?.length ?? 0;

      let result = 0;

      switch (productSortKey) {
        case "name":
          result = compareText(a.name, b.name);
          break;
        case "category":
          result = compareText(a.category, b.category);
          break;
        case "price":
          result = getProductPriceValue(a) - getProductPriceValue(b);
          break;
        case "imageCount":
          result = assetCountA - assetCountB;
          break;
        case "status":
          result = compareText(a.status, b.status);
          break;
        case "updatedAt":
          result = getDateTimeValue(getProductUpdatedAt(a)) - getDateTimeValue(getProductUpdatedAt(b));
          break;
        case "createdAt":
        default:
          result = getDateTimeValue(getProductCreatedAt(a)) - getDateTimeValue(getProductCreatedAt(b));
          break;
      }

      if (result === 0) {
        result = getDateTimeValue(getProductCreatedAt(a)) - getDateTimeValue(getProductCreatedAt(b));
      }

      return result * directionMultiplier;
    });
  }, [assetsByProductId, filteredProducts, productSortDirection, productSortKey]);

  const productResolvedPageSize =
    productPageSize === "all" ? filteredProducts.length || 1 : Number(productPageSize);

  const productTotalPages =
    productPageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredProducts.length / productResolvedPageSize));

  const paginatedProducts = useMemo(() => {
    if (productPageSize === "all") {
      return sortedProducts;
    }

    const safePage = Math.min(productPage, productTotalPages);
    const startIndex = (safePage - 1) * productResolvedPageSize;

    return sortedProducts.slice(startIndex, startIndex + productResolvedPageSize);
  }, [productPage, productPageSize, productResolvedPageSize, productTotalPages, sortedProducts]);

  const productPageStart =
    filteredProducts.length === 0
      ? 0
      : productPageSize === "all"
        ? 1
        : (productPage - 1) * productResolvedPageSize + 1;

  const productPageEnd =
    productPageSize === "all"
      ? filteredProducts.length
      : Math.min(productPage * productResolvedPageSize, filteredProducts.length);
  useEffect(() => {
    setProductPage(1);
  }, [productCategoryFilter, productSearch, productPageSize, productSortDirection, productSortKey, productStatusFilter]);

  useEffect(() => {
    setProductPage((page) => Math.min(page, productTotalPages));
  }, [productTotalPages]);
  const topTryonProducts = useMemo<TopTryonProductRow[]>(() => {
    const productMap = new Map(data.products.map((product) => [product.id, product]));

    const statsMap = new Map<
      string,
      {
        product: Product;
        tryonCount: number;
        billableCount: number;
        completedCount: number;
        failedCount: number;
        latestTryonAt: string | null;
      }
    >();

    for (const job of data.tryonJobs) {
      const product = productMap.get(job.product_id);
      if (!product) continue;

      const current =
        statsMap.get(product.id) ??
        {
          product,
          tryonCount: 0,
          billableCount: 0,
          completedCount: 0,
          failedCount: 0,
          latestTryonAt: null,
        };

      current.tryonCount += 1;

      if (job.is_billable) {
        current.billableCount += 1;
      }

      if (job.status === "completed") {
        current.completedCount += 1;
      }

      if (job.status === "failed") {
        current.failedCount += 1;
      }

      if (
        !current.latestTryonAt ||
        new Date(job.created_at).getTime() > new Date(current.latestTryonAt).getTime()
      ) {
        current.latestTryonAt = job.created_at;
      }

      statsMap.set(product.id, current);
    }

    return Array.from(statsMap.values())
      .sort((a, b) => {
        if (b.tryonCount !== a.tryonCount) {
          return b.tryonCount - a.tryonCount;
        }

        const latestA = a.latestTryonAt ? new Date(a.latestTryonAt).getTime() : 0;
        const latestB = b.latestTryonAt ? new Date(b.latestTryonAt).getTime() : 0;

        return latestB - latestA;
      })
      .map((row, index) => ({
        rank: index + 1,
        ...row,
      }));
  }, [data.products, data.tryonJobs]);

  const filteredTopTryonProducts = useMemo(() => {
    const keyword = topTryonSearch.trim().toLowerCase();

    return topTryonProducts.filter(({ product }) => {
      if (topTryonCategoryFilter !== "all" && product.category !== topTryonCategoryFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        product.name,
        product.external_product_id,
        product.product_url,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [topTryonCategoryFilter, topTryonProducts, topTryonSearch]);

  const topTryonResolvedPageSize =
    topTryonPageSize === "all" ? filteredTopTryonProducts.length || 1 : Number(topTryonPageSize);

  const topTryonTotalPages =
    topTryonPageSize === "all"
      ? 1
      : Math.max(1, Math.ceil(filteredTopTryonProducts.length / topTryonResolvedPageSize));

  const paginatedTopTryonProducts = useMemo(() => {
    if (topTryonPageSize === "all") {
      return filteredTopTryonProducts;
    }

    const safePage = Math.min(topTryonPage, topTryonTotalPages);
    const startIndex = (safePage - 1) * topTryonResolvedPageSize;

    return filteredTopTryonProducts.slice(startIndex, startIndex + topTryonResolvedPageSize);
  }, [filteredTopTryonProducts, topTryonPage, topTryonPageSize, topTryonResolvedPageSize, topTryonTotalPages]);

  const topTryonPageStart =
    filteredTopTryonProducts.length === 0
      ? 0
      : topTryonPageSize === "all"
        ? 1
        : (topTryonPage - 1) * topTryonResolvedPageSize + 1;

  const topTryonPageEnd =
    topTryonPageSize === "all"
      ? filteredTopTryonProducts.length
      : Math.min(topTryonPage * topTryonResolvedPageSize, filteredTopTryonProducts.length);

  useEffect(() => {
    setTopTryonPage(1);
  }, [topTryonCategoryFilter, topTryonSearch, topTryonPageSize]);

  useEffect(() => {
    setTopTryonPage((page) => Math.min(page, topTryonTotalPages));
  }, [topTryonTotalPages]);

  function handleProductSort(sortKey: ProductSortKey) {
    if (productSortKey === sortKey) {
      setProductSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
      return;
    }

    setProductSortKey(sortKey);
    setProductSortDirection(sortKey === "createdAt" || sortKey === "updatedAt" ? "desc" : "asc");
  }

  function getAssetPreviewUrl(asset: ProductAsset) {
    return asset.original_image_url || asset.thumbnail_url || asset.processed_image_url || "";
  }

  function openViewProduct(product: Product) {
    setProductMessage(null);
    setViewingProduct(product);
  }

  function openEditProduct(product: Product) {
    setProductMessage(null);
    setEditingProduct(product);
    setProductForm(productToForm(product));
    setAssetFormRows((assetsByProductId[product.id] ?? []).map(assetToForm));
  }

  async function handleDeleteProduct(product: Product) {
    if (!isShopOwner) {
      setProductMessage("Chỉ chủ shop mới được xóa sản phẩm.");
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${product.name}" không? Sản phẩm sẽ không còn hiển thị trong dashboard/widget.`,
    );

    if (!confirmed) return;

    setDeletingProductId(product.id);
    setProductMessage(null);

    try {
      /**
       * Soft delete để tránh lỗi foreign key với product_assets / tryon_jobs.
       * Public widget hiện chỉ lấy product status = active nên sản phẩm deleted sẽ tự ẩn.
       */
      const deletedProduct = await updateProduct(product.id, { status: "deleted" });

      setData((current) => ({
        ...current,
        products: current.products.filter((item) => item.id !== deletedProduct.id),
        assets: current.assets.filter((asset) => asset.product_id !== deletedProduct.id),
      }));

      if (viewingProduct?.id === product.id || editingProduct?.id === product.id) {
        closeProductModals();
      }

      setProductMessage(`Đã xóa sản phẩm "${product.name}".`);
    } catch (err: unknown) {
      setProductMessage(formatApiError(err, "Không xóa được sản phẩm."));
    } finally {
      setDeletingProductId(null);
    }
  }

  function updateAssetFormRow(id: string, patch: Partial<ProductAssetFormState>) {
    setAssetFormRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function closeProductModals() {
    if (savingProduct) return;
    setViewingProduct(null);
    setEditingProduct(null);
    setProductForm(null);
    setProductMessage(null);
    setAssetFormRows([]);
  }

  async function saveProductChanges() {
    if (!editingProduct || !productForm) return;
    if (!productForm.name.trim()) {
      setProductMessage("Vui lòng nhập tên sản phẩm.");
      return;
    }
    if (!productForm.category.trim()) {
      setProductMessage("Vui lòng nhập category.");
      return;
    }

    setSavingProduct(true);
    setProductMessage(null);
    try {
      const priceValue = productForm.price.trim() ? Number(productForm.price) : null;
      if (priceValue !== null && !Number.isFinite(priceValue)) {
        setProductMessage("Giá sản phẩm không hợp lệ.");
        setSavingProduct(false);
        return;
      }

      const normalizedNewUrls = splitImageUrls(productForm.newImageUrls).map(normalizeImageUrl);
      if (normalizedNewUrls.some((url) => !url)) {
        setProductMessage("URL ảnh mới không hợp lệ. Chỉ hỗ trợ http/https URL.");
        setSavingProduct(false);
        return;
      }
      const uniqueNewUrls = Array.from(new Set(normalizedNewUrls));

      const keptAssetRows = assetFormRows.filter((row) => !row.markedForDeletion);
      const invalidExistingAsset = keptAssetRows.find((row) => !normalizeImageUrl(row.original_image_url));
      if (invalidExistingAsset) {
        setProductMessage("Mỗi ảnh hiện tại cần có original image URL hợp lệ.");
        setSavingProduct(false);
        return;
      }

      const updatedProduct = await updateProduct(editingProduct.id, {
        external_product_id: productForm.external_product_id.trim() || null,
        name: productForm.name.trim(),
        category: productForm.category.trim(),
        price: priceValue,
        currency: productForm.currency.trim() || "VND",
        product_url: productForm.product_url.trim() || null,
        status: productForm.status,
      });

      const deletedAssetIds = assetFormRows.filter((row) => row.markedForDeletion).map((row) => row.id);
      const updatedAssets = await Promise.all(
        keptAssetRows.map((row) =>
          updateProductAsset(row.id, {
            original_image_url: normalizeImageUrl(row.original_image_url),
            thumbnail_url: normalizeImageUrl(row.thumbnail_url) || null,
            processed_image_url: normalizeImageUrl(row.processed_image_url) || null,
            mask_image_url: normalizeImageUrl(row.mask_image_url) || null,
            status: row.status || "uploaded",
            error_message: row.error_message.trim() || null,
          }),
        ),
      );

      await Promise.all(deletedAssetIds.map((assetId) => deleteProductAsset(assetId)));

      const createdAssets = await Promise.all(
        uniqueNewUrls.map((imageUrl) =>
          createProductAsset({
            product_id: editingProduct.id,
            original_image_url: imageUrl,
            thumbnail_url: imageUrl,
            status: "uploaded",
          }),
        ),
      );

      setData((current) => {
        const updatedAssetById = new Map(updatedAssets.map((asset) => [asset.id, asset]));
        const deletedAssetIdSet = new Set(deletedAssetIds);

        return {
          ...current,
          products: current.products.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)),
          assets: [
            ...current.assets
              .filter((asset) => !deletedAssetIdSet.has(asset.id))
              .map((asset) => updatedAssetById.get(asset.id) ?? asset),
            ...createdAssets,
          ],
        };
      });

      // Lưu thành công thì tự động đóng popup edit/view.
      setViewingProduct(null);
      setEditingProduct(null);
      setProductForm(null);
      setAssetFormRows([]);
      setProductMessage(null);
      showSuccessPopup(`Đã lưu thay đổi sản phẩm "${updatedProduct.name}".`);
    } catch (err: unknown) {
      setProductMessage(formatApiError(err, "Không lưu được sản phẩm."));
    } finally {
      setSavingProduct(false);
    }
  }

  function showSuccessPopup(message: string) {
    setSuccessPopupMessage(message);

    window.setTimeout(() => {
      setSuccessPopupMessage(null);
    }, 1800);
  }
  function copyTextToClipboard(value: string, message: string) {
    void navigator.clipboard.writeText(value);
    showSuccessPopup(message);
  }
  function updateWidgetSettingsForm(patch: Partial<WidgetSettingsFormState>) {
    setWidgetSettingsMessage(null);
    setWidgetSettingsForm((current) => ({ ...current, ...patch }));
  }

  async function handleSaveWidgetSettings() {
    if (!isShopOwner) {
      setWidgetSettingsMessage("Chỉ chủ shop/admin mới được sửa Widget Settings.");
      return;
    }

    const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;
    const colorFields = [
      widgetSettingsForm.primary_color,
      widgetSettingsForm.button_color,
      widgetSettingsForm.background_color,
      widgetSettingsForm.text_color,
    ];

    if (colorFields.some((value) => !hexColorPattern.test(value))) {
      setWidgetSettingsMessage("Màu phải đúng định dạng HEX, ví dụ #2563EB.");
      return;
    }

    setSavingWidgetSettings(true);
    setWidgetSettingsMessage(null);

    try {
      const saved = await saveShopWidgetSettings({
        logo_url: widgetSettingsForm.logo_url.trim() || null,
        cover_image_url: widgetSettingsForm.cover_image_url.trim() || null,
        fallback_product_image_url: widgetSettingsForm.fallback_product_image_url.trim() || null,
        primary_color: widgetSettingsForm.primary_color,
        button_color: widgetSettingsForm.button_color,
        background_color: widgetSettingsForm.background_color,
        text_color: widgetSettingsForm.text_color,
        headline: widgetSettingsForm.headline.trim(),
        subheadline: widgetSettingsForm.subheadline.trim(),
        tryon_button_text: widgetSettingsForm.tryon_button_text.trim(),
        buy_button_text: widgetSettingsForm.buy_button_text.trim(),
        show_price: widgetSettingsForm.show_price,
        show_buy_button: widgetSettingsForm.show_buy_button,
        default_product_sort: widgetSettingsForm.default_product_sort,
      });

      setWidgetSettings(saved);
      setWidgetSettingsForm(widgetSettingsToForm(saved));
      showSuccessPopup("Đã lưu Widget Settings thành công.");
    } catch (err: unknown) {
      setWidgetSettingsMessage(formatApiError(err, "Không lưu được Widget Settings."));
    } finally {
      setSavingWidgetSettings(false);
    }
  }

  function logout() {
    clearClientAuth();
    router.replace("/clients/login");
  }

  if (!session) {
    return <main className="min-h-screen bg-slate-950 p-6 text-slate-100">Đang kiểm tra đăng nhập...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-blue-300">Thông tin shop</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{session.shop.name}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {session.shop.domain ?? "Chưa có domain"} · {session.user.email} · Chức vụ: {session.user.role === "owner" ? "Chủ shop" : session.user.role === "employee" ? "Nhân viên" : "Không xác định"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={logout} className="rounded-2xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
              Đăng xuất
            </button>
          </div>
        </header>

        {error ? <p className="mt-5 rounded-2xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</p> : null}

        {loading ? (
          <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-slate-400">Đang tải dữ liệu shop...</section>
        ) : (
          <>
            <DashboardTabs activeTab={activeDashboardTab} onChange={setActiveDashboardTab} />

            {activeDashboardTab === "overview" ? (
              <>
                <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard icon="box" label="Sản phẩm" value={formatNumber(data.products.length)} helper="Tổng số sản phẩm" />
                  <StatCard icon="shirt" label="Mặc thử đã dùng" value={`${formatNumber(billableTryons)} / ${formatNumber(includedTryons)}`} helper={`${formatNumber(remainingTryons)} còn lại · ${formatNumber(processingTryons)} đang xử lý`} />
                  <StatCard icon="wallet" label="Plan hiện tại" value={currentPlan?.name ?? session.shop.plan} helper={`${formatNumber(includedTryons)} Tổng số mặc thử`} />
                  <StatCard icon="shield" label="Widget health" value={widgetHealthStatus} helper={`${formatNumber(publicVisibleProducts.length)} sản phẩm đang hiển thị public`} />
                </section>

                <div className="mt-6">
                  <OverviewTryonColumnChart rows={dailyTryonRows} />
                </div>

                <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                    <h2 className="text-lg font-semibold">Thông tin shop</h2>
                    <dl className="mt-5 grid gap-4 text-sm">
                      <div className="flex justify-between gap-4 border-b border-slate-800 pb-3"><dt className="text-slate-400">Trạng thái</dt><dd className="text-slate-200">{session.shop.status === "active" ? "Hoạt động" : session.shop.status === "inactive" ? "Ngừng hoạt động" : "—"}</dd></div>
                      <div className="flex justify-between gap-4 border-b border-slate-800 pb-3"><dt className="text-slate-400">Thời điểm đăng ký gói plan</dt><dd className="text-slate-200">{formatDate(activeSubscription?.current_period_start)}</dd></div>
                      <div className="flex justify-between gap-4 border-b border-slate-800 pb-3"><dt className="text-slate-400">Thời điểm hết hạn gói plan</dt><dd className="text-slate-200">{formatDate(activeSubscription?.current_period_end)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-slate-400">Số tiền vượt quá gói plan(Nếu có)</dt><dd className="text-slate-200">{currentPlan ? money(currentPlan.overage_price_per_tryon, currentPlan.currency) : "—"}</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                    <h2 className="text-lg font-semibold">Mặc thử gần đây</h2>
                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                      <table className="min-w-full divide-y divide-slate-800 text-sm">
                        <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Ngày</th>
                            <th className="px-4 py-3">Sản phẩm</th>
                            <th className="px-4 py-3">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {[...data.tryonJobs]
                            .sort((a, b) => {
                              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;

                              return dateB - dateA;
                            })
                            .slice(0, 4)
                            .map((job) => (
                              <tr key={job.id}>
                                <td className="px-4 py-3 text-slate-300">
                                  {formatDate(job.created_at)}
                                </td>

                                <td className="px-4 py-3 text-slate-300">
                                  {data.products.find((product) => product.id === job.product_id)?.name ?? "Không xác định"}
                                </td>

                                <td className="px-4 py-3 text-slate-300">
                                  {job.status === "completed" ? "Hoàn thành" : job.status === "failed" ? "Thất bại" : "Đang xử lý"}
                                </td>


                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </>
            ) : null}

            {activeDashboardTab === "analytics" ? (
              <>
                <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">Try-on theo ngày</h2>
                        <p className="mt-1 text-sm text-slate-400">Theo dõi số lượt mặc thử trong 7 ngày gần nhất.</p>
                      </div>
                      <span className="w-fit rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                        7 ngày
                      </span>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                      <table className="min-w-full divide-y divide-slate-800 text-sm">
                        <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Ngày</th>
                            <th className="px-4 py-3 text-right">Tổng</th>
                            <th className="px-4 py-3 text-right">Billable</th>
                            <th className="px-4 py-3 text-right">Hoàn thành</th>
                            <th className="px-4 py-3 text-right">Thất bại</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {dailyTryonRows.map((row) => (
                            <tr key={row.dateKey} className="hover:bg-slate-800/40">
                              <td className="px-4 py-3 text-slate-300">{row.label}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-100">{formatNumber(row.total)}</td>
                              <td className="px-4 py-3 text-right text-blue-300">{formatNumber(row.billable)}</td>
                              <td className="px-4 py-3 text-right text-emerald-300">{formatNumber(row.completed)}</td>
                              <td className="px-4 py-3 text-right text-red-300">{formatNumber(row.failed)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">Widget health</h2>
                        <p className="mt-1 text-sm text-slate-400">Kiểm tra nhanh khả năng hiển thị sản phẩm ngoài widget public.</p>
                      </div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${widgetHealthStatus === "Hoạt động" ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                        {widgetHealthStatus}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <p className="text-xs text-slate-500">Sản phẩm public</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{formatNumber(publicVisibleProducts.length)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <p className="text-xs text-slate-500">Cảnh báo ảnh</p>
                        <p className="mt-2 text-2xl font-semibold text-amber-300">{formatNumber(imageWarningProducts.length)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <p className="text-xs text-slate-500">Chưa được thử</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-100">{formatNumber(productsWithoutTryon.length)}</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      {imageWarningProducts.slice(0, 4).map((row) => (
                        <div key={row.product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-100">{row.product.name}</p>
                            <p className={row.severity === "danger" ? "text-xs text-red-300" : "text-xs text-amber-300"}>{row.issue}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditProduct(row.product)}
                            className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                          >
                            Sửa
                          </button>
                        </div>
                      ))}

                      {imageWarningProducts.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-5 text-center text-sm text-slate-500">
                          Không có cảnh báo ảnh. Các sản phẩm public đã sẵn sàng cho widget.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

              </>
            ) : null}

            {activeDashboardTab === "tryonInsights" ? (
              <>
                <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard icon="shirt" label="Tổng lượt mặc thử" value={formatNumber(data.tryonJobs.length)} helper="Tất cả lượt try-on của shop" />
                  <StatCard icon="check" label="Hoàn thành" value={formatNumber(completedTryons)} helper={formatPercent(data.tryonJobs.length ? (completedTryons / data.tryonJobs.length) * 100 : 0)} />
                  <StatCard icon="x" label="Thất bại" value={formatNumber(failedTryons)} helper={formatPercent(data.tryonJobs.length ? (failedTryons / data.tryonJobs.length) * 100 : 0)} />
                  <StatCard icon="heart" label="Giá trị quan tâm" value={money(potentialInterestValue, currentPlan?.currency ?? "VND")} helper="Tổng giá sản phẩm từ các lượt try-on" />
                </section>

                <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                  <SectionTitle
                    icon="sparkles"
                    title="Gợi ý tối ưu lượt mặc thử"
                    description="Các gợi ý này tập trung vào việc tăng số lượt thử đồ và cải thiện chất lượng catalog."
                    badge="Try-on insights"
                  />

                  <div className="mt-5 grid gap-3 lg:grid-cols-2">
                    {tryonRecommendations.map((item) => (
                      <div
                        key={item.id}
                        className={[
                          "rounded-2xl border p-4",
                          item.tone === "success" ? "border-emerald-500/20 bg-emerald-500/10" : "",
                          item.tone === "warning" ? "border-amber-500/20 bg-amber-500/10" : "",
                          item.tone === "danger" ? "border-red-500/20 bg-red-500/10" : "",
                          item.tone === "info" ? "border-blue-500/20 bg-blue-500/10" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-3">
                          <span className="rounded-xl bg-slate-950/40 p-2 text-slate-100">
                            <Icon name={item.tone === "success" ? "check" : item.tone === "danger" ? "x" : item.tone === "warning" ? "warning" : "sparkles"} className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-100">{item.title}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {tryonRecommendations.length === 0 ? (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-center text-sm text-slate-500 lg:col-span-2">
                        Chưa đủ dữ liệu để đưa ra gợi ý. Hãy tạo thêm try-on từ widget public.
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Sản phẩm được mặc thử nhiều nhất</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Thống kê dựa trên số lượng mặc thử của từng sản phẩm trong shop.
                      </p>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_220px] lg:max-w-2xl">
                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Tìm kiếm sản phẩm
                        </label>
                        <input
                          value={topTryonSearch}
                          onChange={(event) => setTopTryonSearch(event.target.value)}
                          placeholder="Nhập tên, External product ID hoặc URL"
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Danh mục
                        </label>
                        <select
                          value={topTryonCategoryFilter}
                          onChange={(event) => setTopTryonCategoryFilter(event.target.value)}
                          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        >
                          <option value="all">Tất cả danh mục</option>
                          {categoryOptions.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                    <table className="min-w-full divide-y divide-slate-800 text-sm">
                      <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Top</th>
                          <th className="px-4 py-3">Sản phẩm</th>
                          <th className="px-4 py-3">Danh mục</th>
                          <th className="px-4 py-3 text-right">Lượt mặc thử</th>
                          <th className="px-4 py-3 text-right">Có tính tiền</th>
                          <th className="px-4 py-3 text-right">Hoàn thành</th>
                          <th className="px-4 py-3 text-right">Thất bại</th>
                          <th className="px-4 py-3">Lần mặc thử gần nhất</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800">
                        {paginatedTopTryonProducts.map((row) => {
                          const productAssets = assetsByProductId[row.product.id] ?? [];
                          const firstAsset = productAssets[0];

                          return (
                            <tr key={row.product.id} className="hover:bg-slate-800/40">
                              <td className="px-4 py-4">
                                <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-blue-500/10 px-2 text-sm font-bold text-blue-300">
                                  #{row.rank}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  {firstAsset ? (
                                    <img
                                      src={getAssetPreviewUrl(firstAsset)}
                                      alt={row.product.name}
                                      className="h-12 w-12 rounded-xl border border-slate-700 object-cover"
                                      onError={(event) => {
                                        event.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-500">
                                      No img
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-100">{row.product.name}</p>
                                    <p className="mt-1 truncate text-xs text-slate-500">
                                      {row.product.external_product_id ?? row.product.id}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-4 py-4 text-slate-300">{row.product.category}</td>

                              <td className="px-4 py-4 text-right">
                                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm font-semibold text-blue-300">
                                  {formatNumber(row.tryonCount)}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-right text-slate-300">
                                {formatNumber(row.billableCount)}
                              </td>

                              <td className="px-4 py-4 text-right text-emerald-300">
                                {formatNumber(row.completedCount)}
                              </td>

                              <td className="px-4 py-4 text-right text-red-300">
                                {formatNumber(row.failedCount)}
                              </td>

                              <td className="px-4 py-4 text-slate-300">
                                {formatDate(row.latestTryonAt)}
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openViewProduct(row.product)}
                                    className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                                  >
                                    <span className="inline-flex items-center gap-1"><Icon name="eye" className="h-3.5 w-3.5" />View</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openEditProduct(row.product)}
                                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                                  >
                                    <span className="inline-flex items-center gap-1"><Icon name="edit" className="h-3.5 w-3.5" />Sửa</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {filteredTopTryonProducts.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                              {topTryonSearch.trim() || topTryonCategoryFilter !== "all"
                                ? "Không tìm thấy sản phẩm phù hợp."
                                : "Chưa có sản phẩm nào được mặc thử."}
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-col gap-4 border-t border-slate-800 pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-slate-400">
                      Hiển thị{" "}
                      <span className="font-semibold text-slate-200">{formatNumber(topTryonPageStart)}</span>
                      {" - "}
                      <span className="font-semibold text-slate-200">{formatNumber(topTryonPageEnd)}</span>
                      {" trong "}
                      <span className="font-semibold text-slate-200">{formatNumber(filteredTopTryonProducts.length)}</span>
                      {" sản phẩm"}
                      {topTryonCategoryFilter !== "all" ? (
                        <span className="text-slate-500"> · Danh mục: {topTryonCategoryFilter}</span>
                      ) : null}
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-400">Số dòng</span>

                        <select
                          value={topTryonPageSize}
                          onChange={(event) =>
                            setTopTryonPageSize(event.target.value as "5" | "10" | "20" | "50" | "all")
                          }
                          className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="all">All</option>
                        </select>
                      </div>

                      {topTryonPageSize !== "all" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={topTryonPage <= 1}
                            onClick={() => setTopTryonPage((page) => Math.max(1, page - 1))}
                            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Previous
                          </button>

                          <span className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
                            {topTryonPage} / {topTryonTotalPages}
                          </span>

                          <button
                            type="button"
                            disabled={topTryonPage >= topTryonTotalPages}
                            onClick={() => setTopTryonPage((page) => Math.min(topTryonTotalPages, page + 1))}
                            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      ) : (
                        <span className="w-fit rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
                          Showing all
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                    <SectionTitle
                      icon="heart"
                      title="Sản phẩm được quan tâm nhiều nhất"
                      description="Xếp hạng theo số lượt mặc thử và giá trị quan tâm."
                      badge={`${formatNumber(productTryonInsightRows.length)} sản phẩm`}
                    />

                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                      <table className="min-w-full divide-y divide-slate-800 text-sm">
                        <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Top</th>
                            <th className="px-4 py-3">Sản phẩm</th>
                            <th className="px-4 py-3 text-right">Giá</th>
                            <th className="px-4 py-3 text-right">Lượt mặc thử</th>
                            <th className="px-4 py-3 text-right">Giá trị quan tâm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {productTryonInsightRows.slice(0, 8).map((row) => (
                            <tr key={row.product.id} className="hover:bg-slate-800/40">
                              <td className="px-4 py-3 text-blue-300">#{row.rank}</td>
                              <td className="px-4 py-3">
                                <p className="max-w-[240px] truncate font-medium text-slate-100">{row.product.name}</p>
                                <p className="text-xs text-slate-500">{row.product.category}</p>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-300">{money(row.product.price, row.product.currency ?? currentPlan?.currency ?? "VND")}</td>
                              <td className="px-4 py-3 text-right font-semibold text-blue-300">{formatNumber(row.tryonCount)}</td>
                              <td className="px-4 py-3 text-right text-slate-300">{money(row.potentialValue, row.product.currency ?? currentPlan?.currency ?? "VND")}</td>
                            </tr>
                          ))}

                          {productTryonInsightRows.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                Chưa có dữ liệu mặc thử cho sản phẩm.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                    <SectionTitle
                      icon="calendar"
                      title="Lượt mặc thử theo ngày"
                      description="Theo dõi biến động try-on trong 7 ngày gần nhất."
                    />

                    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                      <table className="min-w-full divide-y divide-slate-800 text-sm">
                        <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Ngày</th>
                            <th className="px-4 py-3 text-right">Tổng</th>
                            <th className="px-4 py-3 text-right">Billable</th>
                            <th className="px-4 py-3 text-right">Hoàn thành</th>
                            <th className="px-4 py-3 text-right">Thất bại</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {dailyTryonRows.map((row) => (
                            <tr key={row.dateKey} className="hover:bg-slate-800/40">
                              <td className="px-4 py-3 text-slate-300">{row.label}</td>
                              <td className="px-4 py-3 text-right text-slate-300">{formatNumber(row.total)}</td>
                              <td className="px-4 py-3 text-right text-slate-300">{formatNumber(row.billable)}</td>
                              <td className="px-4 py-3 text-right text-emerald-300">{formatNumber(row.completed)}</td>
                              <td className="px-4 py-3 text-right text-red-300">{formatNumber(row.failed)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                <section className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                    <SectionTitle
                      icon="activity"
                      title="Sản phẩm đang hút lượt thử"
                      description="Nhóm sản phẩm có lượt mặc thử cao hơn mặt bằng chung."
                    />

                    <div className="mt-5 space-y-2">
                      {highInterestProducts.map((row) => (
                        <div key={row.product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-100">{row.product.name}</p>
                            <p className="text-xs text-slate-500">
                              {formatNumber(row.tryonCount)} lượt mặc thử · Giá trị quan tâm {money(row.potentialValue, row.product.currency ?? currentPlan?.currency ?? "VND")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openViewProduct(row.product)}
                            className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                          >
                            Xem
                          </button>
                        </div>
                      ))}

                      {highInterestProducts.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-5 text-center text-sm text-slate-500">
                          Chưa có sản phẩm nào vượt ngưỡng lượt mặc thử trung bình.
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                    <SectionTitle
                      icon="sparkles"
                      title="Cơ hội tăng hiển thị"
                      description="Những sản phẩm ít lượt mặc thử, nên thử đổi ảnh."
                    />

                    <div className="mt-5 space-y-2">
                      {lowExposureProducts.map((row) => (
                        <div key={row.product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-100">{row.product.name}</p>
                            <p className="text-xs text-slate-500">
                              {formatNumber(row.tryonCount)} lượt mặc thử · {row.product.category}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditProduct(row.product)}
                            className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                          >
                            Tối ưu
                          </button>
                        </div>
                      ))}

                      {lowExposureProducts.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-5 text-center text-sm text-slate-500">
                          Chưa có sản phẩm cần tăng hiển thị.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                  <SectionTitle
                    icon="warning"
                    title="Sản phẩm chưa từng được mặc thử"
                    description="Các sản phẩm này có thể cần ảnh đẹp hơn."
                    badge={`${formatNumber(productsWithoutTryon.length)} sản phẩm`}
                  />

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {productsWithoutTryon.slice(0, 6).map((product) => {
                      const firstAsset = (assetsByProductId[product.id] ?? [])[0];
                      return (
                        <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            {firstAsset ? (
                              <img src={getAssetPreviewUrl(firstAsset)} alt={product.name} className="h-10 w-10 rounded-xl object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-slate-700 text-[10px] text-slate-500">No img</div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-100">{product.name}</p>
                              <p className="truncate text-xs text-slate-500">{product.category}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openViewProduct(product)}
                            className="shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                          >
                            Xem
                          </button>
                        </div>
                      );
                    })}

                    {productsWithoutTryon.length === 0 ? (
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-5 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                        Tất cả sản phẩm đang có ít nhất một lượt mặc thử.
                      </div>
                    ) : null}
                  </div>
                </section>
              </>
            ) : null}

            {activeDashboardTab === "widgetSettings" ? (
              <>
                <section className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-slate-950/20 sm:p-6">
                  <SectionTitle
                    icon="widget"
                    title="Widget Settings"
                    description="Cấu hình branding, màu sắc, text hiển thị và hành vi của widget public."
                    badge={widgetSettings ? `Updated ${formatDateTime(widgetSettings.updated_at)}` : "Chưa tải settings"}
                  />

                  {!isShopOwner ? (
                    <p className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                      Tài khoản của bạn chỉ có quyền xem. Chỉ chủ shop/admin mới được chỉnh Widget Settings.
                    </p>
                  ) : null}

                  {widgetSettingsMessage ? (
                    <p className="mt-5 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200">
                      {widgetSettingsMessage}
                    </p>
                  ) : null}

                  <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                    <div className="min-w-0 space-y-5">
                      <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Branding</h3>
                        <div className="mt-4 grid gap-4">
                          <label className="text-sm font-medium text-slate-300">
                            Logo URL
                            <input
                              value={widgetSettingsForm.logo_url}
                              onChange={(event) => updateWidgetSettingsForm({ logo_url: event.target.value })}
                              placeholder="https://.../logo.png"
                              className="mt-2 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-300">
                            Cover image URL
                            <input
                              value={widgetSettingsForm.cover_image_url}
                              onChange={(event) => updateWidgetSettingsForm({ cover_image_url: event.target.value })}
                              placeholder="https://.../cover.jpg"
                              className="mt-2 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-300">
                            Fallback product image URL
                            <input
                              value={widgetSettingsForm.fallback_product_image_url}
                              onChange={(event) => updateWidgetSettingsForm({ fallback_product_image_url: event.target.value })}
                              placeholder="https://.../fallback.jpg"
                              className="mt-2 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                            />
                          </label>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Màu sắc</h3>
                        <div className="mt-4 grid gap-4">
                          {([
                            ["primary_color", "Primary color"],
                            ["button_color", "Button color"],
                            ["background_color", "Background color"],
                            ["text_color", "Text color"],
                          ] as const).map(([key, label]) => (
                            <label key={key} className="text-sm font-medium text-slate-300">
                              {label}
                              <div className="mt-2 flex min-w-0 gap-2">
                                <input
                                  type="color"
                                  value={widgetSettingsForm[key]}
                                  onChange={(event) => updateWidgetSettingsForm({ [key]: event.target.value } as Partial<WidgetSettingsFormState>)}
                                  className="h-12 w-14 shrink-0 rounded-2xl border border-slate-700 bg-slate-950 p-1"
                                />
                                <input
                                  value={widgetSettingsForm[key]}
                                  onChange={(event) => updateWidgetSettingsForm({ [key]: event.target.value } as Partial<WidgetSettingsFormState>)}
                                  className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                                />
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Text hiển thị</h3>
                        <div className="mt-4 grid gap-4">
                          <label className="text-sm font-medium text-slate-300">
                            Headline
                            <input
                              value={widgetSettingsForm.headline}
                              onChange={(event) => updateWidgetSettingsForm({ headline: event.target.value })}
                              maxLength={120}
                              className="mt-2 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-300">
                            Subheadline
                            <textarea
                              value={widgetSettingsForm.subheadline}
                              onChange={(event) => updateWidgetSettingsForm({ subheadline: event.target.value })}
                              maxLength={240}
                              rows={3}
                              className="mt-2 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                            />
                          </label>

                          <div className="grid gap-4 2xl:grid-cols-2">
                            <label className="text-sm font-medium text-slate-300">
                              Text nút try-on
                              <input
                                value={widgetSettingsForm.tryon_button_text}
                                onChange={(event) => updateWidgetSettingsForm({ tryon_button_text: event.target.value })}
                                maxLength={40}
                                className="mt-2 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                              />
                            </label>

                            <label className="text-sm font-medium text-slate-300">
                              Text nút mua
                              <input
                                value={widgetSettingsForm.buy_button_text}
                                onChange={(event) => updateWidgetSettingsForm({ buy_button_text: event.target.value })}
                                maxLength={40}
                                className="mt-2 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Hành vi widget</h3>
                        <div className="mt-4 grid gap-4">
                          <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                            Hiển thị giá
                            <input
                              type="checkbox"
                              checked={widgetSettingsForm.show_price}
                              onChange={(event) => updateWidgetSettingsForm({ show_price: event.target.checked })}
                              className="h-5 w-5 accent-blue-600"
                            />
                          </label>

                          <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                            Hiển thị nút mua
                            <input
                              type="checkbox"
                              checked={widgetSettingsForm.show_buy_button}
                              onChange={(event) => updateWidgetSettingsForm({ show_buy_button: event.target.checked })}
                              className="h-5 w-5 accent-blue-600"
                            />
                          </label>

                          <label className="text-sm font-medium text-slate-300">
                            Sắp xếp sản phẩm mặc định
                            <select
                              value={widgetSettingsForm.default_product_sort}
                              onChange={(event) => updateWidgetSettingsForm({ default_product_sort: event.target.value as WidgetSettingsFormState["default_product_sort"] })}
                              className="mt-2 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                            >
                              <option value="latest">Mới nhất</option>
                              <option value="most_tryon">Nhiều lượt thử nhất</option>
                              <option value="price_asc">Giá thấp đến cao</option>
                              <option value="price_desc">Giá cao đến thấp</option>
                              <option value="name_asc">Tên A-Z</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-5 overflow-hidden">
                      <div
                        className="w-full max-w-full overflow-hidden rounded-3xl border border-slate-800 bg-white shadow-lg shadow-slate-950/20"
                        style={{
                          backgroundColor: widgetSettingsForm.background_color,
                          color: widgetSettingsForm.text_color,
                        }}
                      >
                        {widgetSettingsForm.cover_image_url.trim() ? (
                          <div className="h-40 w-full overflow-hidden bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={widgetSettingsForm.cover_image_url}
                              alt="Widget cover preview"
                              className="h-full w-full object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          </div>
                        ) : null}

                        <div className="p-5">
                          <div className="flex min-w-0 items-start gap-3">
                            {widgetSettingsForm.logo_url.trim() ? (
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={widgetSettingsForm.logo_url}
                                  alt="Logo preview"
                                  className="h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-xs text-slate-500">
                                Logo
                              </div>
                            )}

                            <div className="min-w-0">
                              <p
                                className="text-xs font-semibold uppercase tracking-[0.2em]"
                                style={{ color: widgetSettingsForm.primary_color }}
                              >
                                AI Try-On
                              </p>
                              <h3 className="mt-1 break-words text-xl font-bold">
                                {widgetSettingsForm.headline || defaultWidgetSettingsForm.headline}
                              </h3>
                              <p className="mt-3 break-words text-sm leading-6 opacity-80">
                                {widgetSettingsForm.subheadline || defaultWidgetSettingsForm.subheadline}
                              </p>
                              <button
                                type="button"
                                className="mt-5 rounded-2xl px-5 py-3 text-sm font-bold text-white"
                                style={{ backgroundColor: widgetSettingsForm.button_color }}
                              >
                                {widgetSettingsForm.tryon_button_text || defaultWidgetSettingsForm.tryon_button_text}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

               

                        <div className="mt-5 w-full max-w-full overflow-hidden rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-blue-100">
                                Link widget public
                              </p>

                              {widgetPublicUrl ? (
                                <p className="mt-2 max-w-full break-all text-sm text-blue-200">
                                  {widgetPublicUrl}
                                </p>
                              ) : (
                                <p className="mt-2 text-sm text-slate-400">
                                  Chưa tạo được link widget vì thiếu shop_ref hoặc shop id.
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              {widgetPublicUrl ? (
                                <>
                                  <a
                                    href={widgetPublicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-2xl border border-blue-400/40 px-4 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20"
                                  >
                                    Mở widget
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => copyTextToClipboard(widgetPublicUrl, "Đã copy link widget.")}
                                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
                                  >
                                    Copy link
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 w-full max-w-full overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                          <div className="flex min-w-0 flex-col gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-violet-100">
                                Code nhúng website
                              </p>

                              <p className="mt-2 break-words text-sm leading-6 text-violet-200">
                                Chọn kiểu nhúng phù hợp với website của shop. Iframe phù hợp nhất cho landing page, popup phù hợp cho trang sản phẩm, floating button phù hợp để gắn toàn site.
                              </p>
                            </div>

                            {widgetPublicUrl ? (
                              <div className="mt-3 grid min-w-0 gap-4">
                                <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white">
                                        1. Responsive iframe
                                      </p>
                                      <p className="mt-1 break-words text-xs text-slate-400">
                                        Dùng cho landing page hoặc section riêng. Chiều cao tự co theo màn hình để tránh vỡ layout.
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => copyTextToClipboard(widgetResponsiveEmbedCode, "Đã copy responsive iframe.")}
                                      className="shrink-0 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
                                    >
                                      Copy code
                                    </button>
                                  </div>

                                  <pre className="mt-3 max-h-52 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-2xl border border-slate-800 bg-black/40 p-4 text-xs leading-5 text-slate-200">
                                    <code>{widgetResponsiveEmbedCode}</code>
                                  </pre>
                                </div>

                                <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white">
                                        2. Simple iframe
                                      </p>
                                      <p className="mt-1 break-words text-xs text-slate-400">
                                        Bản iframe ngắn, dễ nhúng vào CMS hoặc page builder.
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => copyTextToClipboard(widgetEmbedCode, "Đã copy iframe.")}
                                      className="shrink-0 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
                                    >
                                      Copy code
                                    </button>
                                  </div>

                                  <pre className="mt-3 max-h-52 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-2xl border border-slate-800 bg-black/40 p-4 text-xs leading-5 text-slate-200">
                                    <code>{widgetEmbedCode}</code>
                                  </pre>
                                </div>

                                <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white">
                                        3. Popup button
                                      </p>
                                      <p className="mt-1 break-words text-xs text-slate-400">
                                        Hiển thị một nút “Thử đồ AI”, khi click sẽ mở widget dạng popup.
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => copyTextToClipboard(widgetPopupEmbedCode, "Đã copy popup embed.")}
                                      className="shrink-0 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
                                    >
                                      Copy code
                                    </button>
                                  </div>

                                  <pre className="mt-3 max-h-52 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-2xl border border-slate-800 bg-black/40 p-4 text-xs leading-5 text-slate-200">
                                    <code>{widgetPopupEmbedCode}</code>
                                  </pre>
                                </div>

                                <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white">
                                        4. Floating button
                                      </p>
                                      <p className="mt-1 break-words text-xs text-slate-400">
                                        Gắn nút nổi ở góc phải dưới website, click sẽ mở widget ở tab mới.
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => copyTextToClipboard(widgetFloatingButtonEmbedCode, "Đã copy floating button.")}
                                      className="shrink-0 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
                                    >
                                      Copy code
                                    </button>
                                  </div>

                                  <pre className="mt-3 max-h-52 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-2xl border border-slate-800 bg-black/40 p-4 text-xs leading-5 text-slate-200">
                                    <code>{widgetFloatingButtonEmbedCode}</code>
                                  </pre>
                                </div>
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-slate-400">
                                Chưa tạo được code nhúng vì thiếu link widget.
                              </p>
                            )}
                          </div>
                        </div>
                      
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setWidgetSettingsForm(widgetSettingsToForm(widgetSettings))}
                      disabled={savingWidgetSettings}
                      className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveWidgetSettings}
                      disabled={savingWidgetSettings || !isShopOwner}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingWidgetSettings ? "Đang lưu..." : "Lưu Widget Settings"}
                    </button>
                  </div>
                </section>
              </>
            ) : null}



            {activeDashboardTab === "products" ? (
              <>
                <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">Sản phẩm của shop</h2>
                      <p className="mt-1 text-sm text-slate-400">
                        Cập nhật trạng thái sản phẩm và các thông tin khác.
                      </p>

                      {!isShopOwner ? (
                        <p className="mt-2 text-xs text-amber-300">
                          Tài khoản của bạn chỉ có quyền xem/sửa. Chỉ chủ shop mới được thêm hoặc xóa sản phẩm.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex w-full flex-col gap-3 xl:max-w-3xl xl:flex-row xl:items-end xl:justify-end">
                      <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_210px_190px] xl:max-w-3xl">
                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Tìm kiếm sản phẩm
                          </label>
                          <input
                            value={productSearch}
                            onChange={(event) => setProductSearch(event.target.value)}
                            placeholder="Tên, external ID, URL..."
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Danh mục
                          </label>
                          <select
                            value={productCategoryFilter}
                            onChange={(event) => setProductCategoryFilter(event.target.value)}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          >
                            <option value="all">Tất cả danh mục</option>
                            {categoryOptions.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Trạng thái
                          </label>
                          <select
                            value={productStatusFilter}
                            onChange={(event) => setProductStatusFilter(event.target.value)}
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          >
                            <option value="all">Tất cả trạng thái</option>
                            {productStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status === "draft"
                                  ? "Chưa đăng bán"
                                  : status === "active"
                                    ? "Đang bán"
                                    : status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {isShopOwner ? (
                        <Link
                          href="/clients/addproducts"
                          className="flex h-[46px] shrink-0 items-center justify-center rounded-2xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                        >
                          Thêm sản phẩm mới
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Chỉ chủ shop mới được thêm sản phẩm"
                          className="flex h-[46px] shrink-0 cursor-not-allowed items-center justify-center rounded-2xl border border-slate-800 px-4 text-sm font-semibold text-slate-500 opacity-70"
                        >
                          Thêm sản phẩm mới
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                    <table className="min-w-full divide-y divide-slate-800 text-sm">
                      <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">
                            <ProductSortButton label="Sản phẩm" sortKey="name" activeSortKey={productSortKey} direction={productSortDirection} onSort={handleProductSort} />
                          </th>
                          <th className="px-4 py-3">
                            <ProductSortButton label="Danh mục" sortKey="category" activeSortKey={productSortKey} direction={productSortDirection} onSort={handleProductSort} />
                          </th>
                          <th className="px-4 py-3 text-right">
                            <ProductSortButton label="Giá" sortKey="price" activeSortKey={productSortKey} direction={productSortDirection} align="right" onSort={handleProductSort} />
                          </th>
                          <th className="px-4 py-3">
                            <ProductSortButton label="Ảnh" sortKey="imageCount" activeSortKey={productSortKey} direction={productSortDirection} onSort={handleProductSort} />
                          </th>
                          <th className="px-4 py-3">
                            <ProductSortButton label="Trạng thái" sortKey="status" activeSortKey={productSortKey} direction={productSortDirection} onSort={handleProductSort} />
                          </th>
                          <th className="px-4 py-3">
                            <ProductSortButton label="Ngày tạo" sortKey="createdAt" activeSortKey={productSortKey} direction={productSortDirection} onSort={handleProductSort} />
                          </th>
                          <th className="px-4 py-3">
                            <ProductSortButton label="Ngày update" sortKey="updatedAt" activeSortKey={productSortKey} direction={productSortDirection} onSort={handleProductSort} />
                          </th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {paginatedProducts.map((product) => {
                          const productAssets = assetsByProductId[product.id] ?? [];
                          const firstAsset = productAssets[0];

                          return (
                            <tr key={product.id} className="hover:bg-slate-800/40">
                              <td className="px-4 py-4">
                                <p className="font-medium text-slate-100">{product.name}</p>
                                <p className="mt-1 max-w-xs truncate text-xs text-slate-500">{product.product_url ?? "Không có URL"}</p>
                              </td>
                              <td className="px-4 py-4 text-slate-300">{product.category}</td>
                              <td className="px-4 py-4 text-right text-slate-300">{product.price ? money(product.price, product.currency ?? "VND") : "—"}</td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  {firstAsset ? (
                                    <img
                                      src={getAssetPreviewUrl(firstAsset)}
                                      alt={product.name}
                                      className="h-12 w-12 rounded-xl border border-slate-700 object-cover"
                                      onError={(event) => {
                                        event.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-500">
                                      No img
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {product.status === "draft"
                                  ? "Chưa đăng bán"
                                  : product.status === "active"
                                    ? "Đang bán"
                                    : product.status ?? "—"}
                              </td>
                              <td className="px-4 py-4 text-slate-300">{formatDateTime(getProductCreatedAt(product))}</td>
                              <td className="px-4 py-4 text-slate-300">{formatDateTime(getProductUpdatedAt(product))}</td>
                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openViewProduct(product)}
                                    className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                                  >
                                    <span className="inline-flex items-center gap-1"><Icon name="eye" className="h-3.5 w-3.5" />Xem</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openEditProduct(product)}
                                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-500"
                                  >
                                    <span className="inline-flex items-center gap-1"><Icon name="edit" className="h-3.5 w-3.5" />Sửa</span>
                                  </button>

                                  {isShopOwner ? (
                                    <button
                                      type="button"
                                      disabled={deletingProductId === product.id}
                                      onClick={() => handleDeleteProduct(product)}
                                      className="rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {deletingProductId === product.id ? "Đang xóa..." : "Xóa"}
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {paginatedProducts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                              {productSearch.trim() || productCategoryFilter !== "all" || productStatusFilter !== "all"
                                ? "Không tìm thấy sản phẩm phù hợp."
                                : "Chưa có sản phẩm nào."}
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-5 flex flex-col gap-4 border-t border-slate-800 pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-slate-400">
                      Hiển thị{" "}
                      <span className="font-semibold text-slate-200">{formatNumber(productPageStart)}</span>
                      {" - "}
                      <span className="font-semibold text-slate-200">{formatNumber(productPageEnd)}</span>
                      {" trong "}
                      <span className="font-semibold text-slate-200">{formatNumber(filteredProducts.length)}</span>
                      {" sản phẩm"}
                      {productCategoryFilter !== "all" ? (
                        <span className="text-slate-500"> · Danh mục: {productCategoryFilter}</span>
                      ) : null}
                      {productStatusFilter !== "all" ? (
                        <span className="text-slate-500">
                          {" · Trạng thái: "}
                          {productStatusFilter === "draft"
                            ? "Chưa đăng bán"
                            : productStatusFilter === "active"
                              ? "Đang bán"
                              : productStatusFilter}
                        </span>
                      ) : null}
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-400">Số dòng</span>

                        <select
                          value={productPageSize}
                          onChange={(event) =>
                            setProductPageSize(event.target.value as "5" | "10" | "20" | "50" | "all")
                          }
                          className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                        >
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="all">All</option>
                        </select>
                      </div>

                      {productPageSize !== "all" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={productPage <= 1}
                            onClick={() => setProductPage((page) => Math.max(1, page - 1))}
                            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Previous
                          </button>

                          <span className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
                            {productPage} / {productTotalPages}
                          </span>

                          <button
                            type="button"
                            disabled={productPage >= productTotalPages}
                            onClick={() => setProductPage((page) => Math.min(productTotalPages, page + 1))}
                            className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      ) : (
                        <span className="w-fit rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200">
                          Showing all
                        </span>
                      )}
                    </div>
                  </div>


                </section>
              </>
            ) : null}

          </>
        )}
      </div>

      {successPopupMessage ? (
        <div className="fixed inset-x-0 top-6 z-[80] flex justify-center px-4">
          <div className="flex max-w-md items-start gap-3 rounded-3xl border border-emerald-500/30 bg-emerald-950/95 px-5 py-4 text-emerald-50 shadow-2xl shadow-black/40 backdrop-blur">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-200">
              <Icon name="check" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Thành công</p>
              <p className="mt-1 text-sm leading-5 text-emerald-100">{successPopupMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessPopupMessage(null)}
              className="ml-2 rounded-xl p-1 text-emerald-200 transition hover:bg-emerald-500/20 hover:text-white"
              aria-label="Đóng thông báo"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {viewingProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-blue-300">Chi tiết sản phẩm</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{viewingProduct.name}</h3>
                <p className="mt-2 text-sm text-slate-400">ID: {viewingProduct.id}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditProduct(viewingProduct)}
                  className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  Sửa sản phẩm
                </button>
                <button
                  type="button"
                  onClick={closeProductModals}
                  className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Đóng
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <dl className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-800 py-3"><dt className="text-slate-400">Danh mục</dt><dd className="text-right text-slate-200">{viewingProduct.category}</dd></div>
                <div className="flex justify-between gap-4 border-b border-slate-800 py-3"><dt className="text-slate-400">Giá</dt><dd className="text-right text-slate-200">{viewingProduct.price ? money(viewingProduct.price, viewingProduct.currency ?? "VND") : "—"}</dd></div>
                <div className="flex justify-between gap-4 border-b border-slate-800 py-3"><dt className="text-slate-400">Trạng thái</dt><dd className="text-right text-slate-200">{viewingProduct.status}</dd></div>
                <div className="flex justify-between gap-4 border-b border-slate-800 py-3"><dt className="text-slate-400">External ID</dt><dd className="max-w-[65%] truncate text-right text-slate-200">{viewingProduct.external_product_id ?? "—"}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-400">Product URL</dt><dd className="max-w-[65%] truncate text-right text-slate-200">{viewingProduct.product_url ?? "—"}</dd></div>
              </dl>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-semibold text-white">Ảnh sản phẩm</h4>
                  <span className="text-sm text-slate-400">{formatNumber(viewingProductAssets.length)} ảnh</span>
                </div>
                {viewingProductAssets.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {viewingProductAssets.map((asset) => (
                      <a
                        key={asset.id}
                        href={getAssetPreviewUrl(asset)}
                        target="_blank"
                        rel="noreferrer"
                        className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50"
                      >
                        <img src={getAssetPreviewUrl(asset)} alt={viewingProduct.name} className="h-44 w-full object-cover transition group-hover:scale-105" />
                        <div className="px-3 py-2 text-xs text-slate-400">{asset.status}</div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                    Sản phẩm chưa có ảnh.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingProduct && productForm ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-blue-300">Chỉnh sửa sản phẩm</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">{editingProduct.name}</h3>
              </div>
              <button
                type="button"
                onClick={closeProductModals}
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-300">
                Tên sản phẩm
                <input
                  value={productForm.name}
                  onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="text-sm font-medium text-slate-300">
                Category
                <select
                  value={categoryOptions.includes(productForm.category) ? productForm.category : customCategoryValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    setProductForm({ ...productForm, category: value === customCategoryValue ? "" : value });
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value={customCategoryValue}>+ Nhập category mới</option>
                </select>
                {(!productForm.category || !categoryOptions.includes(productForm.category)) ? (
                  <input
                    value={productForm.category}
                    onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}
                    placeholder="Nhập category mới"
                    className="mt-2 w-full rounded-2xl border border-blue-700/60 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                  />
                ) : null}
              </label>
              <label className="text-sm font-medium text-slate-300">
                External product ID
                <input
                  value={productForm.external_product_id}
                  onChange={(event) => setProductForm({ ...productForm, external_product_id: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="text-sm font-medium text-slate-300">
                Status
                <select
                  value={productForm.status}
                  onChange={(event) => setProductForm({ ...productForm, status: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="draft">draft</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-300">
                Giá
                <input
                  type="number"
                  min="0"
                  value={productForm.price}
                  onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="text-sm font-medium text-slate-300">
                Currency
                <input
                  value={productForm.currency}
                  onChange={(event) => setProductForm({ ...productForm, currency: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="md:col-span-2 text-sm font-medium text-slate-300">
                Product URL
                <input
                  value={productForm.product_url}
                  onChange={(event) => setProductForm({ ...productForm, product_url: event.target.value })}
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </label>
              <label className="md:col-span-2 text-sm font-medium text-slate-300">
                Thêm ảnh mới bằng URL
                <textarea
                  rows={4}
                  value={productForm.newImageUrls}
                  onChange={(event) => setProductForm({ ...productForm, newImageUrls: event.target.value })}
                  placeholder="Mỗi dòng một URL ảnh, hoặc phân cách bằng dấu phẩy"
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between gap-4">
                <h4 className="font-semibold text-white">Ảnh hiện tại</h4>
                <span className="text-sm text-slate-400">{formatNumber(editingProductAssets.length)} ảnh</span>
              </div>
              {assetFormRows.length ? (
                <div className="mt-4 space-y-4">
                  {assetFormRows.map((asset) => {
                    const previewUrl = normalizeImageUrl(asset.thumbnail_url) || normalizeImageUrl(asset.original_image_url);

                    return (
                      <div
                        key={asset.id}
                        className={`rounded-2xl border p-4 ${asset.markedForDeletion ? "border-red-900 bg-red-950/20 opacity-70" : "border-slate-800 bg-slate-950/50"}`}
                      >
                        <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                            {previewUrl ? (
                              <img src={previewUrl} alt={editingProduct.name} className="h-36 w-full object-cover" />
                            ) : (
                              <div className="flex h-36 items-center justify-center text-xs text-slate-500">Invalid URL</div>
                            )}
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-xs font-medium text-slate-400 md:col-span-2">
                              Original image URL *
                              <input
                                value={asset.original_image_url}
                                disabled={asset.markedForDeletion}
                                onChange={(event) => updateAssetFormRow(asset.id, { original_image_url: event.target.value })}
                                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                              />
                            </label>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => updateAssetFormRow(asset.id, { markedForDeletion: !asset.markedForDeletion })}
                            className={`rounded-xl px-3 py-2 text-xs font-semibold ${asset.markedForDeletion ? "border border-slate-700 text-slate-200 hover:bg-slate-800" : "bg-red-600 text-white hover:bg-red-500"}`}
                          >
                            {asset.markedForDeletion ? "Hoàn tác xoá" : "Xoá ảnh"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Chưa có ảnh.</div>
              )}
            </div>

            {productMessage ? <p className="mt-5 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200">{productMessage}</p> : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeProductModals}
                disabled={savingProduct}
                className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={saveProductChanges}
                disabled={savingProduct}
                className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProduct ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              
            </div>
            
          </div>
        </div>
      ) : null}
    </main>
  );
}
