"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { uploadPlatformAsset } from "@/lib/storage";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  label: string;
  folder: string;
  accept?: string;
  value?: string | null;
  onUploaded: (url: string) => void;
  onClear?: () => void;
  hint?: string;
  preview?: "image" | "file";
}

export function FileUpload({
  label,
  folder,
  accept = "image/*,.png,.jpg,.jpeg,.webp,.svg,.ico",
  value,
  onUploaded,
  onClear,
  hint,
  preview = "image",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();
  const [pending, startTransition] = useTransition();
  const [localName, setLocalName] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalName(file.name);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);

    startTransition(async () => {
      const result = await uploadPlatformAsset(fd);
      if (result.success && result.data) {
        onUploaded(result.data.url);
        success(result.message ?? "تم الرفع");
      } else if (!result.success) {
        error(result.error);
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-2 overflow-hidden">
      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
        {label}
      </span>
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 sm:flex-row sm:items-center dark:border-slate-700 dark:bg-slate-800/70">
        {preview === "image" && value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="معاينة"
            className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-700">
            {preview === "image" ? (
              <ImagePlus className="h-6 w-6" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate text-xs text-slate-600 dark:text-slate-400">
            {localName || hint || "اختر ملفاً للرفع إلى المنصة"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              رفع ملف
            </Button>
            {value && onClear && (
              <Button type="button" size="sm" variant="ghost" onClick={onClear}>
                <X className="h-4 w-4" />
                إزالة
              </Button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
