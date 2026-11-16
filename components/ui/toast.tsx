"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";

type ToastType = "success" | "error";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev, { id, type, message }]);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message) => toast(message, "success"),
      error: (message) => toast(message, "error"),
    }),
    [toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 left-6 z-[100] flex w-full max-w-sm flex-col gap-2"
        dir="rtl"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(item.id), 3500);
    return () => clearTimeout(timer);
  }, [item.id, onClose]);

  const isSuccess = item.type === "success";

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur transition-all animate-in slide-in-from-bottom-2 ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50/95 text-emerald-900"
          : "border-rose-200 bg-rose-50/95 text-rose-900"
      }`}
      role="status"
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
      )}
      <p className="flex-1 text-sm font-medium leading-relaxed">{item.message}</p>
      <button
        type="button"
        onClick={() => onClose(item.id)}
        className="rounded-lg p-1 opacity-60 transition hover:opacity-100"
        aria-label="إغلاق"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
