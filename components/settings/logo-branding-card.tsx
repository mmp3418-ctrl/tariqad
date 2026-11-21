"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlus, RotateCcw, Sparkles } from "lucide-react";
import {
  DEFAULT_LOGO_PATH,
  resetSiteLogo,
  setSiteLogoUrl,
} from "@/app/admin/settings/actions";
import { uploadBrandLogo } from "@/lib/storage";
import type { SiteBranding } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

export function LogoBrandingCard({
  initial,
  onChange,
}: {
  initial: SiteBranding;
  onChange?: (next: SiteBranding) => void;
}) {
  const { success, error } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [branding, setBranding] = useState<SiteBranding>(initial);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setBranding(initial);
    setPreviewFailed(false);
  }, [initial]);

  const displayUrl = branding.logo_url?.trim() || DEFAULT_LOGO_PATH;
  const isCustom = Boolean(branding.logo_url?.trim());
  const busy = uploading || pending;

  function apply(next: SiteBranding) {
    setBranding(next);
    setPreviewFailed(false);
    onChange?.(next);
  }

  async function onFile(file: File | null) {
    if (!file || busy) return;
    setUploading(true);
    try {
      const uploaded = await uploadBrandLogo(file);
      if (!uploaded.success || !uploaded.data) {
        error(uploaded.success === false ? uploaded.error : "تعذّر رفع الشعار");
        return;
      }

      const saved = await setSiteLogoUrl(uploaded.data.publicUrl);
      if (saved.success && saved.data) {
        apply(saved.data);
        success(saved.message ?? "تم تحديث الشعار");
      } else if (!saved.success) {
        error(saved.error);
      }
    } catch (err) {
      console.error("[logo-branding] upload:", err);
      error("تعذّر رفع الشعار حالياً، يرجى المحاولة لاحقاً");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleReset() {
    startTransition(async () => {
      try {
        const result = await resetSiteLogo();
        if (result.success && result.data) {
          apply(result.data);
          success(result.message ?? "تم استعادة الشعار الافتراضي");
        } else if (!result.success) {
          error(result.error);
        }
      } catch (err) {
        console.error("[logo-branding] reset:", err);
        error("تعذّر استعادة الشعار حالياً، يرجى المحاولة لاحقاً");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            شعار المنصة
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            يظهر في شريط التنقل وتذييل المنصة للزوّار
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            {previewFailed ? (
              <span className="text-2xl font-extrabold text-teal-700 dark:text-teal-300">
                ط
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={displayUrl}
                src={displayUrl}
                alt="معاينة شعار المنصة"
                className="max-h-full max-w-full object-contain"
                onError={() => setPreviewFailed(true)}
              />
            )}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {isCustom ? "شعار مخصّص" : "الشعار الافتراضي"}
            </p>
            <p className="mt-1">PNG أو JPG أو WEBP أو SVG — حتى 5MB</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-600 ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <ImagePlus className="h-4 w-4" />
            {uploading ? "جارٍ الرفع…" : "رفع شعار جديد"}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void onFile(e.target.files?.[0] ?? null);
              }}
            />
          </label>
          <button
            type="button"
            disabled={busy || !isCustom}
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" />
            استعادة الافتراضي
          </button>
        </div>
      </div>
    </section>
  );
}
