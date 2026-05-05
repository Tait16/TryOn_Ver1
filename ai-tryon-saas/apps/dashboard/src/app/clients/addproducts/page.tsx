"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProduct, createProductAsset, type Product } from "@/lib/client-auth-api";
import { api } from "@/lib/auth-api";
import { readClientAuth } from "@/lib/client-auth-storage";
import { formatApiError } from "@/lib/format-api-error";

const statusOptions = ["draft", "active"];
const currencyOptions = ["VND", "USD", "JPY"];
const customCategoryValue = "__custom_category__";

export default function ClientAddProductPage() {
  const router = useRouter();
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [categoryMode, setCategoryMode] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [externalProductId, setExternalProductId] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [productUrl, setProductUrl] = useState("");
  const [status, setStatus] = useState("draft");
  const [imageUrl, setImageUrl] = useState("");
  const [imageInputMode, setImageInputMode] = useState<"url" | "upload">("url");
  const [uploadedImageName, setUploadedImageName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [successPopupMessage, setSuccessPopupMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const auth = readClientAuth();
      if (!auth) {
        router.replace("/clients/login");
        return;
      }

      setShopId(auth.shop.id);
      setShopName(auth.shop.name);

      try {
        const { data: products } = await api.get<Product[]>("/api/v1/products");
        const shopProducts = products.filter(
          (product) => product.shop_id === auth.shop.id && product.status !== "deleted",
        );

        const categories = Array.from(
          new Set(
            shopProducts
              .map((product) => product.category?.trim())
              .filter((category): category is string => Boolean(category)),
          ),
        ).sort((a, b) => a.localeCompare(b));

        if (mounted) {
          setCategoryOptions(categories);

          // Nếu shop đã có category, chọn category đầu tiên làm mặc định.
          // Tránh lỗi UI hiển thị category đầu tiên nhưng state `category` vẫn rỗng.
          if (categories.length > 0) {
            setCategoryMode((current) => current || categories[0]);
            setCategory((current) => current || categories[0]);
          } else {
            setCategoryMode(customCategoryValue);
          }
        }
      } catch {
        if (mounted) {
          setCategoryOptions([]);
          setCategoryMode(customCategoryValue);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [router]);

  const selectedImageUrl = useMemo(() => imageUrl.trim(), [imageUrl]);

  function useImageUrl(value: string) {
    setImageInputMode("url");
    setUploadedImageName("");
    setImageUrl(value);
  }

  function handleImageFileChange(file?: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh hợp lệ.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setImageInputMode("upload");
    setUploadedImageName(file.name);
    setImageUrl(objectUrl);
    setError(null);
  }

  function clearSelectedImage() {
    if (imageInputMode === "upload" && imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }

    setImageUrl("");
    setUploadedImageName("");
    setImageInputMode("url");
  }

  function showSuccessPopup(message: string) {
    setSuccessPopupMessage(message);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!shopId) {
      setError("Bạn cần đăng nhập bằng tài khoản shop user trước.");
      return;
    }

    const resolvedCategory =
      categoryMode === customCategoryValue
        ? category.trim()
        : (category.trim() || categoryMode.trim());

    if (!name.trim() || !resolvedCategory) {
      setError("Tên sản phẩm và category là bắt buộc.");
      return;
    }

    if (!selectedImageUrl) {
      setError("Vui lòng thêm 1 ảnh sản phẩm bằng URL hoặc upload từ máy.");
      return;
    }

    setLoading(true);
    try {
      const product = await createProduct({
        shop_id: shopId,
        external_product_id: externalProductId.trim() || null,
        name: name.trim(),
        category: resolvedCategory,
        price: price ? Number(price) : null,
        currency,
        product_url: productUrl.trim() || null,
        status,
        metadata: null,
      });

      await createProductAsset({
        product_id: product.id,
        original_image_url: selectedImageUrl,
        thumbnail_url: selectedImageUrl,
        status: "uploaded",
      });

      setMessage(null);
      showSuccessPopup(`Đã tạo sản phẩm "${product.name}" thành công.`);

      window.setTimeout(() => {
        router.replace("/clients/dashboard");
      }, 1400);
    } catch (err: unknown) {
      setError(formatApiError(err, "Không tạo được sản phẩm."));
    } finally {
      setLoading(false);
    }
  }

  if (!shopId) {
    return <main className="min-h-screen bg-slate-950 p-6 text-slate-100">Đang kiểm tra đăng nhập...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-8">
        {successPopupMessage ? (
          <div className="fixed inset-x-0 top-6 z-[80] flex justify-center px-4">
            <div className="flex max-w-md items-start gap-3 rounded-3xl border border-emerald-500/30 bg-emerald-950/95 px-5 py-4 text-emerald-50 shadow-2xl shadow-black/40 backdrop-blur">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-200">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span> 
              <div className="min-w-0">
                <p className="text-sm font-semibold">Thành công</p>
                <p className="mt-1 text-sm leading-5 text-emerald-100">{successPopupMessage}</p>
                <p className="mt-1 text-xs text-emerald-200/80">Đang quay lại dashboard...</p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessPopupMessage(null)}
                className="ml-2 rounded-xl p-1 text-emerald-200 transition hover:bg-emerald-500/20 hover:text-white"
                aria-label="Đóng thông báo"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : null}

        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
          <Link href="/clients/dashboard" className="text-sm text-blue-400 hover:text-blue-300">← Quay lại dashboard</Link>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm text-slate-400">Shop: {shopName}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Thêm sản phẩm</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Tạo sản phẩm mới cho shop. Mỗi sản phẩm dùng 1 ảnh đại diện để hiển thị trên widget.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/60 hover:bg-emerald-500/20"
              >
                <span className="mr-2">⬆</span>
                Import Excel
              </button>

              <Link
                href="/clients/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Hủy
              </Link>
            </div>
          </div>
        </header>

        <form onSubmit={onSubmit} className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <h2 className="text-lg font-semibold">Thông tin sản phẩm</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-300">Tên sản phẩm *</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ví dụ: Áo thun basic"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="mb-2 block text-sm font-medium text-slate-300">Danh mục *</label>
                <select
                  id="category"
                  value={categoryMode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCategoryMode(value);
                    setCategory(value === customCategoryValue ? "" : value);
                    if (error) setError(null);
                  }}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  required
                >
                  {categoryOptions.length === 0 ? (
                    <option value={customCategoryValue}>+ Nhập danh mục mới</option>
                  ) : null}
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  {categoryOptions.length > 0 ? (
                    <option value={customCategoryValue}>+ Nhập danh mục mới</option>
                  ) : null}
                </select>
                {(categoryMode === customCategoryValue || (!!category && !categoryOptions.includes(category))) ? (
                  <input
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Nhập danh mục mới"
                    className="mt-2 w-full rounded-2xl border border-blue-700/60 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    required
                  />
                ) : null}
              </div>

              <div>
                <label htmlFor="externalProductId" className="mb-2 block text-sm font-medium text-slate-300">External product ID</label>
                <input
                  id="externalProductId"
                  value={externalProductId}
                  onChange={(e) => setExternalProductId(e.target.value)}
                  placeholder="SKU hoặc mã từ hệ thống shop"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label htmlFor="price" className="mb-2 block text-sm font-medium text-slate-300">Giá</label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="250000"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label htmlFor="currency" className="mb-2 block text-sm font-medium text-slate-300">Tiền tệ</label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  {currencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="productUrl" className="mb-2 block text-sm font-medium text-slate-300">URL sản phẩm</label>
                <input
                  id="productUrl"
                  type="url"
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://shop.com/products/ao-thun"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label htmlFor="status" className="mb-2 block text-sm font-medium text-slate-300">Trạng thái</label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                >
                  {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Ảnh sản phẩm</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Mỗi sản phẩm chỉ được thêm 1 ảnh. Bạn có thể dùng URL hoặc upload từ máy.
                </p>
              </div>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                {selectedImageUrl ? "1 ảnh" : "Chưa có ảnh"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setImageInputMode("url")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  imageInputMode === "url"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                Dùng URL
              </button>

              <button
                type="button"
                onClick={() => setImageInputMode("upload")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  imageInputMode === "upload"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                Upload từ máy
              </button>
            </div>

            {imageInputMode === "url" ? (
              <div className="mt-5">
                <label htmlFor="imageUrl" className="mb-2 block text-sm font-medium text-slate-300">
                URL ảnh sản phẩm *
                </label>
                <input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => {
                    useImageUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="https://cdn.shop.com/products/product-image.jpg"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <p className="mt-2 text-xs text-slate-500">
                  URL nên là public HTTPS để widget và AI provider có thể truy cập được.
                </p>
              </div>
            ) : (
              <div className="mt-5">
                <label
                  htmlFor="imageFile"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950 px-5 py-8 text-center transition hover:border-blue-500 hover:bg-slate-900"
                >
                  <span className="text-sm font-semibold text-slate-200">
                    Chọn ảnh từ máy
                  </span>
                  <span className="mt-2 text-xs text-slate-500">
                    JPG, PNG hoặc WebP. Chỉ chọn 1 ảnh.
                  </span>
                  <input
                    id="imageFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleImageFileChange(e.target.files?.[0])}
                  />
                </label>

                {uploadedImageName ? (
                  <p className="mt-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                    Đã chọn: <span className="font-semibold text-white">{uploadedImageName}</span>
                  </p>
                ) : null}

                <p className="mt-2 text-xs text-amber-300">
                  Lưu ý: upload từ máy hiện dùng preview local. Khi tích hợp production, nên upload file lên S3/R2 trước rồi lưu public URL.
                </p>
              </div>
            )}

            {selectedImageUrl ? (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-200">Preview ảnh</p>
                  <button
                    type="button"
                    onClick={clearSelectedImage}
                    className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                  >
                    Xóa ảnh
                  </button>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedImageUrl}
                    alt="Preview sản phẩm"
                    className="aspect-square w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-6 flex aspect-square items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950 text-center text-sm text-slate-500">
                Chưa có ảnh preview
              </div>
            )}
          </section>

          <section className="lg:col-span-2">
            {message ? (
              <p className="mb-4 rounded-2xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                {message}
              </p>
            ) : null}

            {error ? (
              <p className="mb-4 rounded-2xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <div className="sticky bottom-4 z-20 rounded-3xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Hoàn tất thêm sản phẩm</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Kiểm tra thông tin và ảnh preview trước khi tạo sản phẩm.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                  <Link
                    href="/clients/dashboard"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                  >
                    Hủy
                  </Link>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Đang tạo sản phẩm..." : "Tạo sản phẩm"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
