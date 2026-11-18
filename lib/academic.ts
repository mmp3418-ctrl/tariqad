import { isValidHttpUrl } from "@/lib/social";

export const MATERIAL_TYPE_OPTIONS = [
  { value: "book", label: "كتاب" },
  { value: "note", label: "ملزمة / ملاحظات" },
  { value: "worksheet", label: "ورقة عمل" },
] as const;

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