"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** @deprecated Ignored — all modals use max-w-xl for stable centering. */
  size?: "md" | "lg" | "xl";
  footer?: ReactNode;
}

/**
 * Canonical admin modal — portaled to document.body so parent overflow
 * never clips it. Always centered, scroll-safe, theme-contrast safe.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const { t } = useLocale();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t.close}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative z-10 flex w-full max-w-xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 dark:border-slate-800 sm:px-8">
          <h2
            id="modal-title"
            className="min-w-0 truncate text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label={t.close}
          >
            <X className="h-5 w-5" />
            <span className="hidden sm:inline">{t.close}</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-6 sm:p-8">
          {children}
        </div>

        {footer ? (
          <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800 sm:px-8">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
