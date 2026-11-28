/** UUID shape (Postgres gen_random_uuid / uuid columns) */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/**
 * Convert form / query values to a UUID string or null.
 * All FK columns (stage_id, grade_id, subject_id, …) are uuid in Postgres —
 * empty strings, "1", and other non-UUIDs become null (never sent to uuid cols).
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

export const STAGE_GRADE_REQUIRED =
  "يرجى اختيار المرحلة والصف قبل الحفظ.";

/**
 * Map raw DB/API errors to polished Arabic UX copy (never leak internals).
 * Never maps generic UUID/DB errors to stage/grade copy — that message is
 * reserved for explicit stage/grade validation (`STAGE_GRADE_REQUIRED`).
 */
export function arabicDbError(message: string): string {
  const text = String(message ?? "").trim();
  if (!text) return FRIENDLY_GENERIC;

  // Stale / mis-mapped copy from older clients — never show outside form submit.
  // Explicit form validation uses STAGE_GRADE_REQUIRED ("قبل الحفظ") directly
  // and must not go through this mapper.
  if (
    text.includes("اختيار المرحلة والصف بشكل صحيح") ||
    (text.includes("المرحلة والصف") && !text.includes("قبل الحفظ"))
  ) {
    return FRIENDLY_GENERIC;
  }

  if (/invalid input syntax for type uuid/i.test(text)) {
    return FRIENDLY_GENERIC;
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

/** Settings UI: never surface stage/grade validation copy. */
export function settingsUiError(
  message: unknown,
  fallback = FRIENDLY_GENERIC,
): string {
  const text = String(message ?? "").trim();
  if (!text || /المرحلة والصف/.test(text)) return fallback;
  return arabicDbError(text);
}
