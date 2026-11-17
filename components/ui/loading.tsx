"use client";

export function PageLoader({ label = "جاري التحميل..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[var(--muted)]">
      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-teal-700 border-t-transparent dark:border-teal-400" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/60 px-6 py-16 text-center">
      <p className="text-base font-semibold text-[var(--foreground)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-[var(--muted)]">{description}</p>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "تأكيد الحذف",
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onCancel}
        aria-label="إلغاء"
      />
      <div className="relative z-10 w-full max-w-[100vw] rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6">
        <h3 className="text-lg font-bold text-[var(--foreground)]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 rounded-xl px-4 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-70"
          >
            {loading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
