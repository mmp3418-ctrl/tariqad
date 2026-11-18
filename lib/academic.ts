import { isValidHttpUrl } from "@/lib/social";
import type { MaterialType } from "@/lib/types";

/** Public Supabase Storage bucket for uploaded educational PDFs. */
export const MATERIALS_BUCKET = "materials";

/** Exact Arabic badges used in admin + hub */
export const MATERIAL_TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: "كتاب حصة", label: "كتاب حصة" },
  { value: "كتاب واجب", label: "كتاب واجب" },
  { value: "كراسة", label: "كراسة" },
  { value: "قواعد", label: "قواعد" },
  { value: "ورقة عمل", label: "ورقة عمل" },
  { value: "مفردات", label: "مفردات" },
];

const MATERIAL_TYPE_SET = new Set<string>(
  MATERIAL_TYPE_OPTIONS.map((o) => o.value)
);

export function isMaterialType(value: string): value is MaterialType {
  return MATERIAL_TYPE_SET.has(value);
}

export function materialTypeLabel(type: string): string {
  return (
    MATERIAL_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
  );
}

export function isValidPdfUrl(value: string): boolean {
  if (!isValidHttpUrl(value)) return false;
  try {
    const url = new URL(value);
    const path = url.pathname.toLowerCase();
    return (
      path.endsWith(".pdf") ||
      url.hostname.includes("drive.google") ||
      url.hostname.includes("docs.google") ||
      url.hostname.includes("cloudinary") ||
      url.hostname.includes("supabase") ||
      url.searchParams.has("download") ||
      true
    );
  } catch {
    return false;
  }
}

/** Accept youtube.com / youtu.be playlist or watch URLs. */
export function isValidYoutubeUrl(value: string): boolean {
  if (!isValidHttpUrl(value)) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("youtube-nocookie.com")
    );
  } catch {
    return false;
  }
}

export function normalizeYoutubeUrl(value: string): string {
  return value.trim();
}
