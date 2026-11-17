/**
 * Live DB columns (production): title, file_url, description, order_index.
 * App UI still uses title_ar / url / description_ar — map at the boundary.
 */

type Row = Record<string, unknown>;

const TITLE_KEYS = ["title", "title_ar", "name_ar", "name"] as const;
const TITLE_EN_KEYS = ["title_en", "name_en"] as const;
const URL_KEYS = ["file_url", "url", "link", "pdf_url"] as const;
const DESC_KEYS = ["description", "description_ar", "desc_ar"] as const;
const ORDER_KEYS = ["order_index", "sort_order"] as const;

function firstString(row: Row, keys: readonly string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (value != null && typeof value !== "object") return String(value);
  }
  return "";
}

function firstNumber(row: Row, keys: readonly string[], fallback = 0): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return fallback;
}

/** DB row → app-facing fields (title_ar, url, …). */
export function normalizeTitleFields<T extends Row>(row: T): T & {
  title_ar: string;
  title_en: string;
} {
  const title_ar = firstString(row, TITLE_KEYS);
  const title_en = firstString(row, TITLE_EN_KEYS) || title_ar;
  return { ...row, title_ar, title_en };
}

export function normalizeUrlFields<T extends Row>(row: T): T & { url: string } {
  return { ...row, url: firstString(row, URL_KEYS) };
}

export function normalizeResourceRow<T extends Row>(row: T): T & {
  title_ar: string;
  title_en: string;
  url: string;
  subject_ar: string;
  subject_en: string;
  description_ar: string | null;
  sort_order: number;
} {
  const withTitle = normalizeTitleFields(row);
  const withUrl = normalizeUrlFields(withTitle);
  const description = firstString(withUrl, DESC_KEYS);
  const subject_ar =
    firstString(withUrl, ["subject_ar", "subject"]) || withUrl.title_ar;
  return {
    ...withUrl,
    subject_ar,
    subject_en: firstString(withUrl, ["subject_en"]) || subject_ar,
    description_ar: description || null,
    sort_order: firstNumber(withUrl, ORDER_KEYS, 0),
  };
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

export function pickOrder(row: Row): number {
  return firstNumber(row, ORDER_KEYS, 0);
}

/** Build unit/lesson write payload for the live schema. */
export function toUnitWritePayload(input: {
  grade_id?: string;
  unit_id?: string;
  title: string;
  order_index?: number;
  is_coming_soon?: boolean;
}): Row {
  const payload: Row = {
    title: input.title.trim(),
    order_index: input.order_index ?? 0,
    is_coming_soon: input.is_coming_soon ?? false,
  };
  if (input.grade_id) payload.grade_id = input.grade_id;
  if (input.unit_id) payload.unit_id = input.unit_id;
  return payload;
}

/** Build resource write payload for the live schema (`file_url`, `title`, …). */
export function toResourceWritePayload(input: {
  grade_id: string;
  unit_id?: string | null;
  lesson_id?: string | null;
  type: string;
  title: string;
  file_url: string;
  description?: string | null;
  resource_category?: string | null;
  order_index?: number;
  is_coming_soon?: boolean;
}): Row {
  return {
    grade_id: input.grade_id,
    unit_id: input.unit_id?.trim() || null,
    lesson_id: input.lesson_id?.trim() || null,
    type: input.type,
    title: input.title.trim(),
    file_url: input.file_url.trim(),
    description: input.description?.trim() || null,
    resource_category: input.resource_category || null,
    order_index: input.order_index ?? 0,
    is_coming_soon: input.is_coming_soon ?? false,
  };
}

export function toTeacherResourceWritePayload(input: {
  category: string;
  title: string;
  file_url: string;
  description?: string | null;
  grade_id: string;
  unit_id: string;
  is_active?: boolean;
  is_coming_soon?: boolean;
  order_index?: number;
}): Row {
  return {
    category: input.category,
    title: input.title.trim(),
    file_url: input.file_url.trim(),
    description: input.description?.trim() || null,
    grade_id: input.grade_id.trim(),
    unit_id: input.unit_id.trim(),
    is_active: input.is_active ?? true,
    is_coming_soon: input.is_coming_soon ?? false,
    order_index: input.order_index ?? 0,
  };
}

export function toGradeWritePayload(input: {
  stage: string;
  title: string;
  slug?: string;
  order_index?: number;
  is_coming_soon?: boolean;
}): Row {
  const payload: Row = {
    stage: input.stage,
    title: input.title.trim(),
    order_index: input.order_index ?? 0,
    is_coming_soon: input.is_coming_soon ?? false,
  };
  if (input.slug) payload.slug = input.slug;
  return payload;
}

/**
 * If PostgREST says a live column is missing, try known aliases
 * (e.g. title → title_ar on older installs that match schema.sql).
 */
export const WRITE_COLUMN_ALIASES: Record<string, string[]> = {
  title: ["title_ar", "name"],
  title_ar: ["title"],
  file_url: ["url"],
  url: ["file_url"],
  description: ["description_ar"],
  description_ar: ["description"],
  order_index: ["sort_order"],
  sort_order: ["order_index"],
  subject_ar: ["subject"],
  cover_image_url: ["cover_url", "image_url"],
};

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
  return true;
}
