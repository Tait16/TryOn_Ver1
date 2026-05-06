import { api } from "./auth-api";

export type ClientShopUser = {
  id: string;
  shop_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

export type ClientShop = {
  id: string;
  name: string;
  domain: string | null;
  status: string;
  plan: string;
  created_at: string;
  updated_at: string;
};

export type ClientAuthPayload = {
  access_token: string;
  token_type: string;
  user: ClientShopUser;
  shop: ClientShop;
};

export type Product = {
  id: string;
  shop_id: string;
  external_product_id: string | null;
  name: string;
  category: string;
  price: number | string | null;
  currency: string | null;
  product_url: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ProductAsset = {
  id: string;
  product_id: string;
  original_image_url: string;
  processed_image_url: string | null;
  mask_image_url: string | null;
  thumbnail_url: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type Plan = {
  id: string;
  code: string;
  name: string;
  monthly_price: number | string;
  currency: string;
  included_tryons: number;
  overage_price_per_tryon: number | string;
  created_at: string;
};

export type ShopSubscription = {
  id: string;
  shop_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
};

export type TryonJob = {
  id: string;
  shop_id: string;
  product_id: string;
  user_image_url: string | null;
  result_image_url: string | null;
  status: string;
  validation_status: string | null;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
};

export type ShopWidgetSettings = {
  id: string;
  shop_id: string;
  logo_url: string | null;
  cover_image_url: string | null;
  fallback_product_image_url: string | null;
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
  default_product_sort: "latest" | "most_tryon" | "price_asc" | "price_desc" | "name_asc" | string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type ShopWidgetSettingsUpdatePayload = Partial<{
  logo_url: string | null;
  cover_image_url: string | null;
  fallback_product_image_url: string | null;
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
  metadata: Record<string, unknown> | null;
}>;

export async function clientLoginRequest(email: string, password: string) {
  const { data } = await api.post<ClientAuthPayload>("/api/v1/client/login", {
    email,
    password,
  });
  return data;
}

export async function forgotClientPassword(email: string) {
  const { data } = await api.post<{ message: string }>(
    "/api/v1/client/forgot-password",
    { email },
  );
  return data;
}

export async function resetClientPassword(token: string, password: string) {
  const { data } = await api.post<{ message: string }>(
    "/api/v1/client/reset-password",
    { token, password },
  );
  return data;
}

export type ProductPayload = {
  shop_id: string;
  external_product_id?: string | null;
  name: string;
  category: string;
  price?: number | null;
  currency: string;
  product_url?: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
};

export type ProductUpdatePayload = Partial<Omit<ProductPayload, "shop_id">>;

export type ProductAssetPayload = {
  product_id: string;
  original_image_url: string;
  processed_image_url?: string | null;
  mask_image_url?: string | null;
  thumbnail_url?: string | null;
  status?: string;
  error_message?: string | null;
};

export type ProductAssetUpdatePayload = Partial<Omit<ProductAssetPayload, "product_id">>;

export async function createProduct(body: ProductPayload) {
  const { data } = await api.post<Product>("/api/v1/products", body);
  return data;
}

export async function updateProduct(productId: string, body: ProductUpdatePayload) {
  const { data } = await api.patch<Product>(`/api/v1/products/${productId}`, body);
  return data;
}

export async function deleteProduct(productId: string) {
  const { data } = await api.delete<Product>(`/api/v1/products/${productId}`);
  return data;
}

export async function createProductAsset(body: ProductAssetPayload) {
  const { data } = await api.post<ProductAsset>("/api/v1/product-assets", body);
  return data;
}

export async function updateProductAsset(assetId: string, body: ProductAssetUpdatePayload) {
  const { data } = await api.patch<ProductAsset>(`/api/v1/product-assets/${assetId}`, body);
  return data;
}

export async function deleteProductAsset(assetId: string) {
  const { data } = await api.delete<ProductAsset>(`/api/v1/product-assets/${assetId}`);
  return data;
}

export async function fetchShopWidgetSettings() {
  const { data } = await api.get<ShopWidgetSettings>("/api/v1/shop-widget-settings/me");
  return data;
}

export async function saveShopWidgetSettings(body: ShopWidgetSettingsUpdatePayload) {
  const { data } = await api.put<ShopWidgetSettings>("/api/v1/shop-widget-settings/me", body);
  return data;
}
