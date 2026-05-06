"use client";

import { useEffect, useMemo, useState } from "react";
import ProductPreview from "@/components/ProductPreview";
import TryOnResult from "@/components/TryOnResult";
import UploadUserImage from "@/components/UploadUserImage";
import {
  createTryOnJob,
  getTryOnJob,
  getWidgetBodyModels,
  getWidgetConfig,
  getWidgetProduct,
  getWidgetProducts,
  normalizePublicImageUrl,
  type TryOnJob,
  type WidgetBodyModel,
  type WidgetConfig,
  type WidgetProduct,
  type WidgetShop,
} from "@/lib/widget-api";
import { createVisitorId, postWidgetEvent } from "@/lib/post-message";

type Props = {
  shopRef: string;
  productId?: string;
};

export default function TryOnWidget({ shopRef, productId }: Props) {
  const [shop, setShop] = useState<WidgetShop | null>(null);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [products, setProducts] = useState<WidgetProduct[]>([]);
  const [bodyModels, setBodyModels] = useState<WidgetBodyModel[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(productId || null);
  const [selectedBodyModelId, setSelectedBodyModelId] = useState<string | null>(null);
  const [showBodyModelModal, setShowBodyModelModal] = useState(false);
  const [bodyModelSearchQuery, setBodyModelSearchQuery] = useState("");
  const [bodyModelTypeFilter, setBodyModelTypeFilter] = useState("all");
  const [userImageUrl, setUserImageUrl] = useState("");
  const [job, setJob] = useState<TryOnJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<"6" | "12" | "24" | "48" | "all">("6");

  const theme = widgetConfig?.theme;
  const labels = widgetConfig?.labels;
  const behavior = widgetConfig?.behavior;

  const primaryColor = theme?.primary_color || "#2563eb";
  const buttonColor = theme?.button_color || "#2563eb";
  const backgroundColor = theme?.background_color || "#f8fafc";
  const textColor = theme?.text_color || "#0f172a";

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );


  const categories = useMemo(() => {
    const uniqueCategories = products
      .map((product) => product.category?.trim())
      .filter((category): category is string => Boolean(category));

    return Array.from(new Set(uniqueCategories)).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const bodyModelTypes = useMemo(() => {
    const uniqueTypes = bodyModels
      .map((model) => model.model_type?.trim())
      .filter((modelType): modelType is string => Boolean(modelType));

    return Array.from(new Set(uniqueTypes)).sort((a, b) => a.localeCompare(b));
  }, [bodyModels]);

  const filteredBodyModels = useMemo(() => {
    const normalizedSearch = bodyModelSearchQuery.trim().toLowerCase();

    return bodyModels.filter((model) => {
      const matchesSearch = normalizedSearch
        ? [model.name, model.model_type, model.id]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))
        : true;

      const matchesType = bodyModelTypeFilter === "all" ? true : model.model_type === bodyModelTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [bodyModelSearchQuery, bodyModels, bodyModelTypeFilter]);

  const selectedBodyModel = useMemo(
    () => bodyModels.find((model) => model.id === selectedBodyModelId) || null,
    [bodyModels, selectedBodyModelId],
  );

  const sortedProducts = useMemo(() => {
    const sort = behavior?.default_product_sort || "latest";

    return [...products].sort((a, b) => {
      if (sort === "price_asc" || sort === "price_desc") {
        const priceA = Number(a.price ?? 0);
        const priceB = Number(b.price ?? 0);
        const safePriceA = Number.isFinite(priceA) ? priceA : 0;
        const safePriceB = Number.isFinite(priceB) ? priceB : 0;

        return sort === "price_asc" ? safePriceA - safePriceB : safePriceB - safePriceA;
      }

      if (sort === "name_asc") {
        return a.name.localeCompare(b.name, "vi", { sensitivity: "base", numeric: true });
      }

      // Backend currently returns products in default order.
      // Keep that order for latest/most_tryon until the catalog API returns created_at/tryon_count.
      return 0;
    });
  }, [behavior?.default_product_sort, products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return sortedProducts.filter((product) => {
      const matchesName = normalizedSearch
        ? product.name.toLowerCase().includes(normalizedSearch)
        : true;

      const matchesCategory =
        selectedCategory === "all" ? true : product.category === selectedCategory;

      return matchesName && matchesCategory;
    });
  }, [searchQuery, selectedCategory, sortedProducts]);

  const pageSize = itemsPerPage === "all" ? filteredProducts.length || 1 : Number(itemsPerPage);

  const totalPages = itemsPerPage === "all" ? 1 : Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  const paginatedProducts = useMemo(() => {
    if (itemsPerPage === "all") {
      return filteredProducts;
    }

    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * pageSize;

    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredProducts, itemsPerPage, pageSize, totalPages]);

  const currentPageStart =
    filteredProducts.length === 0 ? 0 : itemsPerPage === "all" ? 1 : (currentPage - 1) * pageSize + 1;

  const currentPageEnd =
    itemsPerPage === "all" ? filteredProducts.length : Math.min(currentPage * pageSize, filteredProducts.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setError("");
      setJob(null);

      try {
        if (!shopRef) {
          throw new Error("Missing shop_ref. Pass ?shop_ref=<shop_id|domain|shop-name> to the widget URL.");
        }

        if (productId) {
          const [config, data, bodyModelData] = await Promise.all([
            getWidgetConfig(shopRef),
            getWidgetProduct(productId, shopRef),
            getWidgetBodyModels(shopRef),
          ]);

          if (ignore) return;
          setWidgetConfig(config);
          setShop(data.shop);
          setProducts([data.product]);
          setBodyModels(bodyModelData.body_models);
          setSelectedProductId(data.product.id);
        } else {
          const [config, data, bodyModelData] = await Promise.all([
            getWidgetConfig(shopRef),
            getWidgetProducts(shopRef),
            getWidgetBodyModels(shopRef),
          ]);

          if (ignore) return;
          setWidgetConfig(config);
          setShop(data.shop);
          setProducts(data.products);
          setBodyModels(bodyModelData.body_models);
          setSelectedProductId((current) => current || data.products[0]?.id || null);
        }

        postWidgetEvent("AI_TRYON_WIDGET_READY", { shopRef, productId });
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : "Cannot load widget.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [productId, shopRef]);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const timer = window.setInterval(async () => {
      try {
        const nextJob = await getTryOnJob(job.id);
        setJob(nextJob);

        if (nextJob.status === "completed") {
          postWidgetEvent("AI_TRYON_JOB_COMPLETED", {
            jobId: nextJob.id,
            resultImageUrl: nextJob.result_image_url,
          });
        }

        if (nextJob.status === "failed") {
          postWidgetEvent("AI_TRYON_JOB_FAILED", {
            jobId: nextJob.id,
            message: nextJob.error_message,
          });
        }
      } catch {
        // Keep the current state and retry on the next interval.
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [job]);

  function handleSelectProduct(product: WidgetProduct) {
    setSelectedProductId(product.id);
    setJob(null);
    postWidgetEvent("AI_TRYON_PRODUCT_SELECTED", {
      productId: product.id,
      productName: product.name,
    });
  }

  function handleSelectBodyModel(model: WidgetBodyModel) {
    if (!model.thumbnail_url) return;

    const normalizedThumbnailUrl = normalizePublicImageUrl(model.thumbnail_url);
    if (!normalizedThumbnailUrl) {
      setError("Body model này chưa có ảnh hợp lệ.");
      return;
    }

    setSelectedBodyModelId(model.id);
    setUserImageUrl(normalizedThumbnailUrl);
    setShowBodyModelModal(false);
    setJob(null);
    setError("");

    postWidgetEvent("AI_TRYON_BODY_MODEL_SELECTED", {
      bodyModelId: model.id,
      bodyModelName: model.name,
    });
  }

  async function handleGenerate() {
    setError("");

    if (!selectedProduct) {
      setError("Vui lòng chọn sản phẩm trước.");
      return;
    }

    const normalizedUserImageUrl = normalizePublicImageUrl(userImageUrl);
    if (!normalizedUserImageUrl) {
      setError("Vui lòng tải lên ảnh hợp lệ trước khi tạo kết quả try-on.");
      return;
    }

    setSubmitting(true);
    try {
      const createdJob = await createTryOnJob({
        product_id: selectedProduct.id,
        user_image_url: normalizedUserImageUrl,
        visitor_id: createVisitorId(),
      });
      setJob(createdJob);
      postWidgetEvent("AI_TRYON_JOB_CREATED", {
        jobId: createdJob.id,
        productId: selectedProduct.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo job try-on.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Đang tải AI Try-On...</p>
        </div>
      </main>
    );
  }

  if (error && products.length === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-4">
        <div className="max-w-md rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-700 shadow-sm">
          <p className="text-sm font-semibold">Không thể tải widget</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen p-4 sm:p-6"
      style={{ backgroundColor, color: textColor }}
    >
      <div className="mx-auto w-full max-w-7xl">
        <header
          className="overflow-hidden rounded-3xl shadow-sm"
          style={{ backgroundColor: primaryColor, color: "#ffffff" }}
        >
          {widgetConfig?.shop.cover_image_url?.trim() ? (
            <div className="h-44 w-full overflow-hidden bg-black/10 sm:h-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={widgetConfig.shop.cover_image_url}
                alt={widgetConfig.shop.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}

          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-4">
                {widgetConfig?.shop.logo_url ? (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={widgetConfig.shop.logo_url}
                      alt={widgetConfig.shop.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/75">
                    AI Try-On
                  </p>
                  <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
                    {labels?.headline || `Mặc thử sản phẩm từ ${shop?.name || "Shop này"} với AI`}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-white/80">
                    {labels?.subheadline || "Chọn một sản phẩm, tải lên ảnh của bạn, và xem kết quả."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {products.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Không có sản phẩm hoạt động với ảnh sản phẩm được cung cấp cho shop này.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-base font-semibold text-slate-950">Bước 1: Chọn sản phẩm bạn muốn thử</h1>
                </div>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {filteredProducts.length} / {products.length} sản phẩm
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tìm kiếm theo tên sản phẩm
                  </label>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Tìm kiếm theo tên sản phẩm..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Danh mục
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="all">Tất cả danh mục</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">Không tìm thấy sản phẩm</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Vui lòng thay đổi từ khóa hoặc chọn danh mục khác.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {paginatedProducts.map((product) => (
                      <ProductPreview
                        key={product.id}
                        product={product}
                        selected={product.id === selectedProductId}
                        onSelect={handleSelectProduct}
                        config={widgetConfig}
                      />
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-slate-500">
                      Hiển thị{" "}
                      <span className="font-semibold text-slate-800">{currentPageStart}</span>
                      {" - "}
                      <span className="font-semibold text-slate-800">{currentPageEnd}</span>
                      {" trên "}
                      <span className="font-semibold text-slate-800">{filteredProducts.length}</span>
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-500">Mỗi trang</span>

                        <select
                          value={itemsPerPage}
                          onChange={(event) =>
                            setItemsPerPage(event.target.value as "6" | "12" | "24" | "48" | "all")
                          }
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                        >
                          <option value="6">6</option>
                          <option value="12">12</option>
                          <option value="24">24</option>
                          <option value="48">48</option>
                          <option value="all">Tất cả</option>
                        </select>
                      </div>

                      {itemsPerPage !== "all" ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Trước
                          </button>

                          <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                            {currentPage} / {totalPages}
                          </span>

                          <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Sau
                          </button>
                        </div>
                      ) : (
                        <span className="w-fit rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                          Hiển thị tất cả
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </section>

            <div className="space-y-4">
              <UploadUserImage
                value={userImageUrl}
                disabled={submitting}
                hasBodyModels={bodyModels.length > 0}
                onChange={(imageUrl) => {
                  setUserImageUrl(imageUrl);
                  setSelectedBodyModelId(null);
                }}
                onOpenBodyModels={() => setShowBodyModelModal(true)}
              />

              {selectedBodyModel ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  Đang dùng body model: <span className="font-semibold">{selectedBodyModel.name}</span>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
              ) : null}

              <button
                type="button"
                disabled={!selectedProduct || !userImageUrl || submitting}
                onClick={handleGenerate}
                style={{ backgroundColor: buttonColor }}
                className="w-full rounded-3xl px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Đang mặc thử..." : labels?.tryon_button_text || "Mặc thử"}
              </button>

              <TryOnResult
                job={job}
                onReset={() => {
                  setJob(null);
                  setUserImageUrl("");
                }}
              />
            </div>
          </div>
        )}
      </div>

      {showBodyModelModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl shadow-slate-950/30">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Body Models</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Chọn mẫu người mặc</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chọn một model có sẵn. Ảnh model sẽ được đưa vào bước tải ảnh của bạn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBodyModelModal(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tìm kiếm model
                </label>
                <input
                  value={bodyModelSearchQuery}
                  onChange={(event) => setBodyModelSearchQuery(event.target.value)}
                  placeholder="Tìm theo tên model..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Loại model
                </label>
                <select
                  value={bodyModelTypeFilter}
                  onChange={(event) => setBodyModelTypeFilter(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">Tất cả model</option>
                  {bodyModelTypes.map((modelType) => (
                    <option key={modelType} value={modelType}>
                      {modelType}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredBodyModels.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">Không tìm thấy body model</p>
                <p className="mt-1 text-sm text-slate-500">
                  Vui lòng đổi từ khóa, loại model hoặc thêm body model trong dashboard.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredBodyModels.map((model) => {
                  const thumbnailUrl = normalizePublicImageUrl(model.thumbnail_url || "");
                  const selected = selectedBodyModelId === model.id;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      disabled={!thumbnailUrl}
                      onClick={() => handleSelectBodyModel(model)}
                      className={[
                        "group overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60",
                        selected ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-200",
                      ].join(" ")}
                    >
                      <div className="aspect-[3/4] bg-slate-100">
                        {thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailUrl}
                            alt={model.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-slate-400">
                            Không có ảnh model
                          </div>
                        )}
                      </div>

                      <div className="p-3">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-950">
                          {model.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {model.model_type || "default"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
