/**
 * Normalize rows from Supabase so the app always sees the canonical
 * schema fields (title_ar, url, …) even when a live DB still uses
 * legacy aliases (title, file_url, …).
 */

type Row = Record<string, unknown>;

const TITLE_KEYS = ["title_ar", "title", "name_ar", "name"] as const;
const TITLE_EN_KEYS = ["title_en", "name_en"] as const;
const URL_KEYS = ["url", "file_url", "link", "pdf_url"] as const;

function firstString(row: Row, keys: readonly string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (value != null && typeof value !== "object") return String(value);
  }
  return "";
}

function firstNullableString(row: Row, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (value === null) return null;
    if (typeof value === "string") return value;
  }
  return null;
}

/** Map a DB row (any alias mix) → app-facing title/url fields. */
export function normalizeTitleFields<T extends Row>(row: T): T & {
  title_ar: string;
  title_en: string;
} {
  const title_ar = firstString(row, TITLE_KEYS);
  const title_en = firstString(row, TITLE_EN_KEYS) || title_ar;
  return { ...row, title_ar, title_en };
}

export function normalizeUrlFields<T extends Row>(row: T): T & { url: string } {
  const url = firstString(row, URL_KEYS);
  return { ...row, url };
}

export function normalizeResourceRow<T extends Row>(row: T): T & {
  title_ar: string;
  title_en: string;
  url: string;
  subject_ar: string;
  subject_en: string;
} {
  const withTitle = normalizeTitleFields(row);
  const withUrl = normalizeUrlFields(withTitle);
  const subject_ar =
    firstString(withUrl, ["subject_ar", "subject"]) || withUrl.title_ar;
  const subject_en =
    firstString(withUrl, ["subject_en"]) || subject_ar;
  return { ...withUrl, subject_ar, subject_en };
}

export function normalizeRelatedTitle(
  related: unknown
): { id: string; title_ar: string; stage?: string } | null {
  if (!related || typeof related !== "object") return null;
  const row = related as Row;
  const id = row.id != null ? String(row.id) : "";
  if (!id) return null;
  const title_ar = firstString(row, TITLE_KEYS);
  const stage = typeof row.stage === "string" ? row.stage : undefined;
  return stage ? { id, title_ar, stage } : { id, title_ar };
}

/** When PostgREST says a column is missing, try these remaps on write. */
export const WRITE_COLUMN_ALIASES: Record<string, string[]> = {
  title_ar: ["title", "name_ar", "name"],
  title_en: ["title_en", "name_en"],
  url: ["file_url", "link", "pdf_url"],
  description_ar: ["description", "desc_ar"],
  subject_ar: ["subject"],
  cover_image_url: ["cover_url", "image_url", "thumbnail_url"],
};

/**
 * If `missing` is a known canonical field present in payload, rename it
 * to the next unused alias. Returns true when the payload changed.
 */
export function remapMissingWriteColumn(
  payload: Row,
  missing: string
): boolean {
  const aliases = WRITE_COLUMN_ALIASES[missing];
  if (!aliases || !(missing in payload)) return false;

  const value = payload[missing];
  delete payload[missing];

  for (const alias of aliases) {
    if (!(alias in payload)) {
      payload[alias] = value;
      return true;
    }
  }
  return true; // stripped without replacement
}

export function pickTitle(row: Row): string {
  return firstString(row, TITLE_KEYS);
}

export function pickUrl(row: Row): string {
  return firstString(row, URL_KEYS);
}

export function pickNullable(row: Row, keys: string[]): string | null {
  return firstNullableString(row, keys);
}
