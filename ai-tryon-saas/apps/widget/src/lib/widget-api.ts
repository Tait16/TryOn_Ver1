const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type WidgetShop = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
};

export type WidgetProduct = {
  id: string;
  shop_id: string;
  name: string;
  category: string;
  price: number | string | null;
  currency: string | null;
  product_url: string | null;
  status: string;
  image_url: string | null;
  thumbnail_url: string | null;
};

export type WidgetBodyModel = {
  id: string;
  shop_id: string;
  name: string;
  thumbnail_url: string | null;
  model_type: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type WidgetBodyModelsResponse = {
  shop: WidgetShop;
  body_models: WidgetBodyModel[];
};

export type WidgetCatalogResponse = {
  shop: WidgetShop;
  products: WidgetProduct[];
};

export type WidgetConfig = {
  shop: {
    id: string;
    name: string;
    domain: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
  };
  theme: {
    primary_color: string;
    button_color: string;
    background_color: string;
    text_color: string;
  };
  labels: {
    headline: string;
    subheadline: string;
    tryon_button_text: string;
    buy_button_text: string;
  };
  behavior: {
    show_price: boolean;
    show_buy_button: boolean;
    default_product_sort: "latest" | "most_tryon" | "price_asc" | "price_desc" | "name_asc" | string;
    fallback_product_image_url: string | null;
  };
};

export type WidgetProductResponse = {
  shop: WidgetShop;
  product: WidgetProduct;
};

export type TryOnJob = {
  id: string;
  shop_id: string;
  product_id: string;
  user_image_url: string | null;
  result_image_url: string | null;
  status: "queued" | "processing" | "completed" | "failed" | string;
  validation_status: string | null;
  error_code?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateTryOnJobInput = {
  product_id: string;
  user_image_url: string;
  visitor_id?: string;
};

function buildUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = await response.json();
      if (typeof payload.detail === "string") {
        message = payload.detail;
      }
    } catch {
      // Keep default message when response is not JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function normalizePublicImageUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:", "data:"].includes(parsed.protocol)) return "";
    if (parsed.protocol === "data:" && !trimmed.startsWith("data:image/")) return "";
    return trimmed;
  } catch {
    return "";
  }
}


export async function getWidgetConfig(shopRef: string) {
  return requestJson<WidgetConfig>(
    `/api/v1/widget/shops/${encodeURIComponent(shopRef)}/config`,
  );
}

export async function getWidgetProducts(shopRef: string) {
  return requestJson<WidgetCatalogResponse>(
    `/api/v1/widget/shops/${encodeURIComponent(shopRef)}/products`,
  );
}

export async function getWidgetBodyModels(shopRef: string) {
  try {
    return await requestJson<WidgetBodyModelsResponse>(
      `/api/v1/widget/shops/${encodeURIComponent(shopRef)}/body-models`,
    );
  } catch {
    // Fallback for the current backend where body_models is still exposed by the generic CRUD route.
    // Production recommendation: add the public widget endpoint above to avoid exposing all body models.
    const [config, bodyModels] = await Promise.all([
      getWidgetConfig(shopRef),
      requestJson<WidgetBodyModel[]>("/api/v1/body-models?skip=0&limit=1000"),
    ]);

    const filteredModels = bodyModels.filter((model) => {
      return (
        model.shop_id === config.shop.id &&
        model.status !== "deleted" &&
        Boolean(normalizePublicImageUrl(model.thumbnail_url || ""))
      );
    });

    return {
      shop: {
        id: config.shop.id,
        name: config.shop.name,
        domain: config.shop.domain,
      },
      body_models: filteredModels,
    };
  }
}

export async function getWidgetProduct(productId: string, shopRef?: string) {
  const params = new URLSearchParams();
  if (shopRef) params.set("shop_ref", shopRef);

  const query = params.toString();
  return requestJson<WidgetProductResponse>(
    `/api/v1/widget/products/${encodeURIComponent(productId)}${query ? `?${query}` : ""}`,
  );
}

export async function createTryOnJob(input: CreateTryOnJobInput) {
  return requestJson<TryOnJob>("/api/v1/widget/tryon-jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getTryOnJob(jobId: string) {
  return requestJson<TryOnJob>(`/api/v1/widget/tryon-jobs/${encodeURIComponent(jobId)}`);
}
