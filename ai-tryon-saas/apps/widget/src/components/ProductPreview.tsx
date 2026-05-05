import type { WidgetProduct } from "@/lib/widget-api";

type Props = {
  product: WidgetProduct;
  selected: boolean;
  onSelect: (product: WidgetProduct) => void;
};

function formatPrice(product: WidgetProduct) {
  if (product.price === null || product.price === undefined || product.price === "") return null;

  const numericPrice = Number(product.price);
  if (Number.isNaN(numericPrice)) return `${product.price} ${product.currency || ""}`.trim();

  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: product.currency || "VND",
      maximumFractionDigits: 0,
    }).format(numericPrice);
  } catch {
    return `${numericPrice.toLocaleString("vi-VN")} ${product.currency || ""}`.trim();
  }
}

export default function ProductPreview({ product, selected, onSelect }: Props) {
  const price = formatPrice(product);
  const imageUrl = product.thumbnail_url || product.image_url;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(product)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(product);
        }
      }}
      className={`group flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        selected ? "border-blue-500 ring-4 ring-blue-100" : "border-slate-200"
      }`}
    >
      <div className="aspect-square bg-slate-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-slate-400">
            Không có ảnh sản phẩm
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="space-y-1">
          <p className="line-clamp-2 text-sm font-semibold text-slate-950">
            {product.name}
          </p>

          <p className="text-xs text-slate-500">
            {product.category || "Chưa phân loại"}
          </p>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
              {price || "Liên hệ"}
            </p>

            {product.product_url ? (
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                Mua
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}