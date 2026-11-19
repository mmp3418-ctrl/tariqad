/** UUID shape (Postgres gen_random_uuid / uuid columns) */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/**
 * Convert form / query values to a UUID or null.
 * Empty strings, "1", and other non-UUIDs become null (never sent to uuid columns).
 */
export function toUuidOrNull(value: unknown): string | null {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw || raw === "1" || raw === "0") return null;
  return isUuid(raw) ? raw : null;
}

/** Require a valid UUID for `.eq('id', …)` on uuid primary keys. */
export function requireUuid(
  value: unknown,
  label = "العنصر"
): { ok: true; id: string } | { ok: false; error: string } {
  const id = toUuidOrNull(value);
  if (!id) {
    return {
      ok: false,
      error: `${label} غير صالح. حدّث الصفحة وحاول مرة أخرى.`,
    };
  }
  return { ok: true, id };
}

export function isMissingColumnError(message: string, column: string): boolean {
  return (
    new RegExp(column, "i").test(message) &&
    /(column|schema cache|does not exist)/i.test(message)
  );
}

const FRIENDLY_GENERIC =
  "تعذّر إتمام العملية حالياً، يرجى المحاولة لاحقاً.";

/** Map raw DB/API errors to polished Arabic UX copy (never leak internals). */
export function arabicDbError(message: string): string {
  const text = String(message ?? "").trim();
  if (!text) return FRIENDLY_GENERIC;

  if (/invalid input syntax for type uuid/i.test(text)) {
    return "يرجى اختيار المرحلة والصف بشكل صحيح.";
  }
  if (/duplicate key|unique constraint/i.test(text)) {
    return "هذا السجل موجود مسبقاً.";
  }
  if (
    /column|schema cache|does not exist|relation|permission|jwt|api|postgres|supabase|vercel|network|fetch failed|timeout/i.test(
      text
    )
  ) {
    return "تعذّر تحميل أو حفظ البيانات حالياً، يرجى المحاولة لاحقاً.";
  }
  // Snake_case / English internals → generic Arabic
  if (/[a-z]+_[a-z]+/.test(text) || /[A-Za-z]{4,}/.test(text)) {
    return FRIENDLY_GENERIC;
  }
  return text;
}

export const STAGE_GRADE_REQUIRED =
  "يرجى اختيار المرحلة والصف قبل الحفظ.";
