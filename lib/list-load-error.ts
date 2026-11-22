import { arabicDbError } from "@/lib/ids";

const LIST_LOAD_FALLBACK =
  "تعذّر تحميل القائمة حالياً، يرجى المحاولة لاحقاً.";

/** Friendly Arabic for list fetch toasts — never surface stage/grade copy on mount. */
export function listLoadError(message: unknown): string {
  const text = String(message ?? "").trim();
  if (!text || /المرحلة والصف/.test(text)) return LIST_LOAD_FALLBACK;
  return arabicDbError(text);
}