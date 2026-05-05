"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/auth-api";
import { clearAuth, readAuth } from "@/lib/auth-storage";
import { formatApiError } from "@/lib/format-api-error";

type FieldType = "text" | "number" | "boolean" | "datetime" | "json" | "textarea";

type FieldConfig = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  readonly?: boolean;
};

type EntityConfig = {
  key: string;
  label: string;
  endpoint: string;
  fields: FieldConfig[];
  tableFields: string[];
};

type RowData = Record<string, unknown>;
type FormState = Record<string, string>;

const entities: EntityConfig[] = [
  {
    key: "shops",
    label: "Shops",
    endpoint: "/api/v1/shops",
    tableFields: ["name", "domain", "status", "plan", "created_at"],
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "domain", label: "Domain" },
      { name: "status", label: "Status", defaultValue: "active" },
      { name: "plan", label: "Plan", defaultValue: "pilot" },
    ],
  },
  {
    key: "shop-users",
    label: "Shop Users",
    endpoint: "/api/v1/shop-users",
    tableFields: ["shop_id", "email", "full_name", "role", "created_at"],
    fields: [
      { name: "shop_id", label: "Shop ID", required: true },
      { name: "email", label: "Email", required: true },
      { name: "password_hash", label: "Password Hash", type: "textarea", required: true },
      { name: "full_name", label: "Full Name" },
      { name: "role", label: "Role", defaultValue: "owner" },
    ],
  },
  {
    key: "api-keys",
    label: "API Keys",
    endpoint: "/api/v1/api-keys",
    tableFields: ["shop_id", "key_prefix", "status", "last_used_at", "created_at"],
    fields: [
      { name: "shop_id", label: "Shop ID", required: true },
      { name: "key_prefix", label: "Key Prefix", required: true },
      { name: "key_hash", label: "Key Hash", type: "textarea", required: true },
      { name: "status", label: "Status", defaultValue: "active" },
      { name: "last_used_at", label: "Last Used At", type: "datetime" },
    ],
  },
  {
    key: "products",
    label: "Products",
    endpoint: "/api/v1/products",
    tableFields: ["shop_id", "name", "category", "price", "currency", "status"],
    fields: [
      { name: "shop_id", label: "Shop ID", required: true },
      { name: "external_product_id", label: "External Product ID" },
      { name: "name", label: "Name", required: true },
      { name: "category", label: "Category", required: true },
      { name: "price", label: "Price", type: "number" },
      { name: "currency", label: "Currency", defaultValue: "VND" },
      { name: "product_url", label: "Product URL" },
      { name: "status", label: "Status", defaultValue: "draft" },
      { name: "metadata", label: "Metadata JSON", type: "json", placeholder: '{"color":"red"}' },
    ],
  },
  {
    key: "product-assets",
    label: "Product Assets",
    endpoint: "/api/v1/product-assets",
    tableFields: ["product_id", "original_image_url", "status", "created_at", "updated_at"],
    fields: [
      { name: "product_id", label: "Product ID", required: true },
      { name: "original_image_url", label: "Original Image URL", required: true },
      { name: "processed_image_url", label: "Processed Image URL" },
      { name: "mask_image_url", label: "Mask Image URL" },
      { name: "thumbnail_url", label: "Thumbnail URL" },
      { name: "status", label: "Status", defaultValue: "uploaded" },
      { name: "error_message", label: "Error Message", type: "textarea" },
    ],
  },
  {
    key: "tryon-jobs",
    label: "Try-On Jobs",
    endpoint: "/api/v1/tryon-jobs",
    tableFields: ["shop_id", "product_id", "status", "validation_status", "is_billable", "created_at"],
    fields: [
      { name: "shop_id", label: "Shop ID", required: true },
      { name: "product_id", label: "Product ID", required: true },
      { name: "user_image_url", label: "User Image URL" },
      { name: "result_image_url", label: "Result Image URL" },
      { name: "status", label: "Status", defaultValue: "queued" },
      { name: "validation_status", label: "Validation Status" },
      { name: "error_code", label: "Error Code" },
      { name: "error_message", label: "Error Message", type: "textarea" },
      { name: "processing_time_ms", label: "Processing Time MS", type: "number" },
      { name: "ai_cost_usd", label: "AI Cost USD", type: "number" },
      { name: "is_billable", label: "Is Billable", type: "boolean", defaultValue: false },
      { name: "visitor_id", label: "Visitor ID" },
      { name: "client_ip_hash", label: "Client IP Hash", type: "textarea" },
      { name: "user_agent", label: "User Agent", type: "textarea" },
    ],
  },
  {
    key: "usage-events",
    label: "Usage Events",
    endpoint: "/api/v1/usage-events",
    tableFields: ["shop_id", "product_id", "tryon_job_id", "event_type", "visitor_id", "created_at"],
    fields: [
      { name: "shop_id", label: "Shop ID", required: true },
      { name: "product_id", label: "Product ID" },
      { name: "tryon_job_id", label: "Try-On Job ID" },
      { name: "event_type", label: "Event Type", required: true },
      { name: "visitor_id", label: "Visitor ID" },
      { name: "metadata", label: "Metadata JSON", type: "json" },
    ],
  },
  {
    key: "plans",
    label: "Plans",
    endpoint: "/api/v1/plans",
    tableFields: ["code", "name", "monthly_price", "included_tryons", "overage_price", "created_at"],
    fields: [
      { name: "code", label: "Code", required: true },
      { name: "name", label: "Name", required: true },
      { name: "monthly_price", label: "Monthly Price", type: "number", required: true },
      { name: "included_tryons", label: "Included Tryons", type: "number", required: true },
      { name: "overage_price", label: "Overage Price", type: "number" },
    ],
  },
  {
    key: "shop-subscriptions",
    label: "Shop Subscriptions",
    endpoint: "/api/v1/shop-subscriptions",
    tableFields: ["shop_id", "plan_id", "status", "current_period_start", "current_period_end"],
    fields: [
      { name: "shop_id", label: "Shop ID", required: true },
      { name: "plan_id", label: "Plan ID", required: true },
      { name: "status", label: "Status", defaultValue: "active" },
      { name: "current_period_start", label: "Current Period Start", type: "datetime", required: true },
      { name: "current_period_end", label: "Current Period End", type: "datetime", required: true },
    ],
  },
  {
    key: "monthly-usage",
    label: "Monthly Usage",
    endpoint: "/api/v1/monthly-usage",
    tableFields: ["shop_id", "year_month", "billable_tryons", "total_tryon_requests", "failed_tryons", "rejected_tryons"],
    fields: [
      { name: "shop_id", label: "Shop ID", required: true },
      { name: "year_month", label: "Year Month", placeholder: "2026-05", required: true },
      { name: "billable_tryons", label: "Billable Tryons", type: "number", defaultValue: 0 },
      { name: "total_tryon_requests", label: "Total Tryon Requests", type: "number", defaultValue: 0 },
      { name: "failed_tryons", label: "Failed Tryons", type: "number", defaultValue: 0 },
      { name: "rejected_tryons", label: "Rejected Tryons", type: "number", defaultValue: 0 },
    ],
  },
  {
    key: "accounts",
    label: "Accounts",
    endpoint: "/api/v1/accounts",
    tableFields: ["username", "email", "full_name", "role", "created_at"],
    fields: [
      { name: "username", label: "Username", required: true },
      { name: "email", label: "Email", required: true },
      { name: "password_hash", label: "Password Hash", type: "textarea", required: true },
      { name: "full_name", label: "Full Name" },
      { name: "role", label: "Role", defaultValue: "admin" },
    ],
  },
];

function getInitialForm(entity: EntityConfig): FormState {
  return entity.fields.reduce<FormState>((acc, field) => {
    if (field.type === "json") {
      acc[field.name] = field.defaultValue ? JSON.stringify(field.defaultValue, null, 2) : "";
    } else {
      acc[field.name] = field.defaultValue == null ? "" : String(field.defaultValue);
    }
    return acc;
  }, {});
}

function toDatetimeLocal(value: unknown): string {
  if (!value || typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function valueToInputValue(value: unknown, field: FieldConfig): string {
  if (value == null) return "";
  if (field.type === "json") return JSON.stringify(value, null, 2);
  if (field.type === "datetime") return toDatetimeLocal(value);
  if (field.type === "boolean") return String(Boolean(value));
  return String(value);
}

function buildPayload(entity: EntityConfig, form: FormState, mode: "create" | "edit") {
  const payload: RowData = {};

  for (const field of entity.fields) {
    const rawValue = form[field.name];
    const value = rawValue?.trim() ?? "";

    if (mode === "edit" && value === "") continue;
    if (mode === "create" && value === "" && !field.required) continue;

    if (field.type === "number") {
      payload[field.name] = value === "" ? null : Number(value);
    } else if (field.type === "boolean") {
      payload[field.name] = value === "true";
    } else if (field.type === "json") {
      payload[field.name] = value === "" ? null : JSON.parse(value);
    } else if (field.type === "datetime") {
      payload[field.name] = value === "" ? null : new Date(value).toISOString();
    } else {
      payload[field.name] = value;
    }
  }

  return payload;
}

function renderValue(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export default function AdminPage() {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState(entities[0].key);
  const selectedEntity = useMemo(
    () => entities.find((entity) => entity.key === selectedKey) ?? entities[0],
    [selectedKey],
  );

  const [rows, setRows] = useState<RowData[]>([]);
  const [form, setForm] = useState<FormState>(() => getInitialForm(selectedEntity));
  const [editingRow, setEditingRow] = useState<RowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const auth = readAuth();
    if (!auth) {
      router.replace("/login");
      return;
    }
    api.defaults.headers.common.Authorization = `Bearer ${auth.access_token}`;
  }, [router]);

  useEffect(() => {
    setEditingRow(null);
    setForm(getInitialForm(selectedEntity));
    void fetchRows(selectedEntity);
  }, [selectedEntity]);

  async function fetchRows(entity = selectedEntity) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<RowData[]>(entity.endpoint, {
        params: { skip: 0, limit: 100 },
      });
      setRows(data);
    } catch (err) {
      setError(formatApiError(err, `Không tải được dữ liệu ${entity.label}.`));
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setEditingRow(null);
    setForm(getInitialForm(selectedEntity));
    setMessage(null);
    setError(null);
  }

  function startEdit(row: RowData) {
    const nextForm: FormState = {};
    for (const field of selectedEntity.fields) {
      nextForm[field.name] = valueToInputValue(row[field.name], field);
    }
    setEditingRow(row);
    setForm(nextForm);
    setMessage(null);
    setError(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildPayload(selectedEntity, form, editingRow ? "edit" : "create");
      if (editingRow?.id) {
        await api.patch(`${selectedEntity.endpoint}/${editingRow.id}`, payload);
        setMessage("Cập nhật thành công.");
      } else {
        await api.post(selectedEntity.endpoint, payload);
        setMessage("Tạo mới thành công.");
      }
      startCreate();
      await fetchRows();
    } catch (err) {
      setError(formatApiError(err, "Lưu thất bại. Kiểm tra dữ liệu nhập."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(row: RowData) {
    if (!row.id) return;
    const ok = window.confirm(`Xóa bản ghi ${String(row.id)}?`);
    if (!ok) return;

    setError(null);
    setMessage(null);
    try {
      await api.delete(`${selectedEntity.endpoint}/${row.id}`);
      setMessage("Đã xóa bản ghi.");
      await fetchRows();
    } catch (err) {
      setError(formatApiError(err, "Xóa thất bại."));
    }
  }

  function logout() {
    clearAuth();
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-700/80 p-5 shadow-xl md:flex-row md:items-center md:justify-between" style={{ background: "var(--card)" }}>
          <div>
            <p className="text-sm text-blue-300">AI Try-On</p>
            <h1 className="mt-1 text-2xl font-semibold">Admin CRUD</h1>
            <p className="mt-1 text-sm text-slate-400">
              Quản lý tất cả bảng đang khai báo trong FastAPI models.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
              Dashboard
            </Link>
            <button type="button" onClick={logout} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">
              Đăng xuất
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border border-slate-700/80 p-4" style={{ background: "var(--card)" }}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Tables</h2>
            <div className="space-y-2">
              {entities.map((entity) => (
                <button
                  key={entity.key}
                  type="button"
                  onClick={() => setSelectedKey(entity.key)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedKey === entity.key
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {entity.label}
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-700/80 p-5" style={{ background: "var(--card)" }}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedEntity.label}</h2>
                  <p className="mt-1 text-sm text-slate-400">Endpoint: {selectedEntity.endpoint}</p>
                </div>
                <button type="button" onClick={startCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">
                  Tạo mới
                </button>
              </div>

              {error ? <p className="mb-4 rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-200">{error}</p> : null}
              {message ? <p className="mb-4 rounded-lg bg-green-950/60 px-3 py-2 text-sm text-green-200">{message}</p> : null}

              <form onSubmit={submitForm} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {selectedEntity.fields.map((field) => (
                  <label key={field.name} className={field.type === "textarea" || field.type === "json" ? "md:col-span-2 xl:col-span-3" : ""}>
                    <span className="mb-1 block text-sm font-medium text-slate-300">
                      {field.label}{field.required ? " *" : ""}
                    </span>
                    {field.type === "textarea" || field.type === "json" ? (
                      <textarea
                        value={form[field.name] ?? ""}
                        onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                        placeholder={field.placeholder}
                        required={field.required && !editingRow}
                        rows={field.type === "json" ? 5 : 3}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-slate-100 outline-none ring-blue-500/50 focus:ring-2"
                      />
                    ) : field.type === "boolean" ? (
                      <select
                        value={form[field.name] ?? "false"}
                        onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-slate-100 outline-none ring-blue-500/50 focus:ring-2"
                      >
                        <option value="false">false</option>
                        <option value="true">true</option>
                      </select>
                    ) : (
                      <input
                        type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                        step={field.type === "number" ? "any" : undefined}
                        value={form[field.name] ?? ""}
                        onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}
                        placeholder={field.placeholder}
                        required={field.required && !editingRow}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-slate-100 outline-none ring-blue-500/50 focus:ring-2"
                      />
                    )}
                  </label>
                ))}

                <div className="flex items-end gap-3 md:col-span-2 xl:col-span-3">
                  <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60">
                    {saving ? "Đang lưu..." : editingRow ? "Cập nhật" : "Tạo mới"}
                  </button>
                  {editingRow ? (
                    <button type="button" onClick={startCreate} className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-800">
                      Hủy sửa
                    </button>
                  ) : null}
                </div>
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-700/80" style={{ background: "var(--card)" }}>
              <div className="flex items-center justify-between border-b border-slate-700/80 p-4">
                <h3 className="font-semibold">Danh sách</h3>
                <button type="button" onClick={() => fetchRows()} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
                  Reload
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700 text-sm">
                  <thead className="bg-slate-900/40 text-left text-slate-300">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">ID</th>
                      {selectedEntity.tableFields.map((field) => (
                        <th key={field} className="whitespace-nowrap px-4 py-3">{field}</th>
                      ))}
                      <th className="whitespace-nowrap px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/70">
                    {loading ? (
                      <tr><td colSpan={selectedEntity.tableFields.length + 2} className="px-4 py-6 text-center text-slate-400">Đang tải...</td></tr>
                    ) : rows.length === 0 ? (
                      <tr><td colSpan={selectedEntity.tableFields.length + 2} className="px-4 py-6 text-center text-slate-400">Chưa có dữ liệu.</td></tr>
                    ) : rows.map((row) => (
                      <tr key={String(row.id)} className="hover:bg-slate-900/30">
                        <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-slate-300" title={String(row.id ?? "")}>{renderValue(row.id)}</td>
                        {selectedEntity.tableFields.map((field) => (
                          <td key={field} className="max-w-[260px] truncate px-4 py-3 text-slate-200" title={renderValue(row[field])}>
                            {renderValue(row[field])}
                          </td>
                        ))}
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button type="button" onClick={() => startEdit(row)} className="mr-2 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800">
                            Sửa
                          </button>
                          <button type="button" onClick={() => deleteRow(row)} className="rounded-lg border border-red-700 px-3 py-1.5 text-xs text-red-200 hover:bg-red-950/50">
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
