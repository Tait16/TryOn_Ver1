import type { TryOnJob } from "@/lib/widget-api";

type Props = {
  job: TryOnJob | null;
  onReset: () => void;
};

export default function TryOnResult({ job, onReset }: Props) {
  if (!job) return null;

  const isLoading = job.status === "queued" || job.status === "processing";
  const isFailed = job.status === "failed";
  const isCompleted = job.status === "completed";
  const resultImageUrl = job.result_image_url || job.user_image_url;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Kết quả mặc thử</h2>
          <p className="mt-1 text-sm text-slate-500">Kết quả AI giúp bạn hình dung sản phẩm khi mặc. Vui lòng tham khảo bảng size của shop để chọn size phù hợp.</p>
        </div>

      </div>

      {isLoading ? (
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          Kết quả AI giúp bạn hình dung sản phẩm khi mặc. Vui lòng tham khảo bảng size của shop để chọn size phù hợp.
        </div>
      ) : null}

      {isFailed ? (
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {job.error_message || "Mã lỗi: " + job.error_code + ". Vui lòng thử lại với ảnh khác."}
        </div>
      ) : null}

      {resultImageUrl && !isFailed ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resultImageUrl} alt="Try-on result" className="max-h-[520px] w-full object-contain" />
        </div>
      ) : null}

      <button
        type="button"
        onClick={onReset}
        className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Thử với ảnh khác
      </button>
    </section>
  );
}
