"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function PageLoader({ label = "جاري التحميل..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-400">
      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-teal-700 border-t-transparent dark:border-teal-400" />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
        {label}
      </p>
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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Confirm / delete dialog — same centering rules as Modal. */
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
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (gap > 0) document.body.style.paddingRight = `${gap}px`;

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
        aria-label="إلغاء"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:p-8"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3
            id="confirm-dialog-title"
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
            <span className="hidden sm:inline">إغلاق</span>
          </button>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-10 rounded-xl px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-70"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
