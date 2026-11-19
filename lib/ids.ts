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
  label = "المعرّف"
): { ok: true; id: string } | { ok: false; error: string } {
  const id = toUuidOrNull(value);
  if (!id) {
    return {
      ok: false,
      error: `${label} غير صالح — يجب أن يكون UUID صحيحاً`,
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

export function arabicDbError(message: string): string {
  if (/invalid input syntax for type uuid/i.test(message)) {
    return "قيمة معرّف غير صالحة (UUID). تأكد من اختيار مرحلة/صف صحيحين.";
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return "هذا السجل موجود مسبقاً.";
  }
  return message;
}
