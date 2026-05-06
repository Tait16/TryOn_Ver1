import { useRef, useState } from "react";
import { normalizePublicImageUrl } from "@/lib/widget-api";

type Props = {
  value: string;
  disabled?: boolean;
  hasBodyModels?: boolean;
  onChange: (imageUrl: string) => void;
  onOpenBodyModels?: () => void;
};

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
    reader.readAsDataURL(file);
  });
}

export default function UploadUserImage({ value, disabled, hasBodyModels, onChange, onOpenBodyModels }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [error, setError] = useState("");

  async function handleFileChange(file: File | undefined) {
    setError("");
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Chỉ hỗ trợ JPEG, PNG, hoặc WebP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Ảnh quá lớn. Kích thước tối đa là 8MB.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải ảnh đã chọn.");
    }
  }

  function useImageUrl() {
    setError("");
    const normalized = normalizePublicImageUrl(imageUrlInput);
    if (!normalized) {
      setError("Vui lòng nhập URL ảnh hợp lệ (http/https).");
      return;
    }
    onChange(normalized);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-950">Bước 2: Tải lên ảnh của bạn</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tải lên một ảnh rõ dáng người của bạn (đứng trước camera).
          </p>
        </div>
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 disabled:opacity-50"
          >
            Xóa
          </button>
        ) : null}
      </div>

      {value ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="User preview" className="max-h-80 w-full object-contain" />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="text-sm font-medium text-slate-700">Chọn một ảnh để bắt đầu</p>
          <p className="mt-1 text-xs text-slate-500">JPEG, PNG, WebP up to 8MB.</p>
        </div>
      )}

<div className="mt-4 grid gap-3">
<div className="grid gap-3 sm:grid-cols-2">
        {/* Use body model */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Chọn mẫu người
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Dùng ảnh body model có sẵn của shop.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled || !hasBodyModels}
            onClick={onOpenBodyModels}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {hasBodyModels ? "Chọn mẫu" : "Chưa có mẫu"}
          </button>
        </div>

        {/* Upload from device */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Tải ảnh từ thiết bị
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Chọn ảnh JPG, PNG hoặc WebP từ máy của bạn.
              </p>
            </div>

           
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Tải ảnh lên
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />
        </div>
</div>
        {/* Use image URL */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Dùng URL ảnh
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Dán URL ảnh mà bạn muốn dùng.
              </p>
            </div>

          
          </div>

          <div className="mt-4 space-y-3">

            <input
              value={imageUrlInput}
              disabled={disabled}
              onChange={(event) => setImageUrlInput(event.target.value)}
              placeholder="https://example.com/user-photo.jpg"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              disabled={disabled || !imageUrlInput.trim()}
              onClick={useImageUrl}
              className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sử dụng URL
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
