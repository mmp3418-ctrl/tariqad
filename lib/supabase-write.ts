import { supabase } from "@/lib/supabase";
import { remapMissingWriteColumn } from "@/lib/schema-compat";

type Row = Record<string, unknown>;

const OPTIONAL_FK_KEYS = [
  "lesson_id",
  "unit_id",
  "grade_id",
  "cover_image_url",
] as const;

/** Empty strings break uuid / nullable text columns — coerce to null. */
export function sanitizeUuidFields<T extends Row>(row: T): T {
  const next = { ...row };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (value === "" || value === undefined) {
      if (
        key.endsWith("_id") ||
        key === "cover_image_url" ||
        key === "description" ||
        key === "description_ar" ||
        key === "description_en" ||
        key === "file_url" ||
        key === "url"
      ) {
        (next as Row)[key] = null;
      }
    }
  }
  return next;
}

function missingColumnName(message: string): string | null {
  const lower = message.toLowerCase();
  const patterns = [
    /column ["']?([a-z0-9_]+)["']? of relation/i,
    /could not find the ['"]([a-z0-9_]+)['"] column/i,
    /unknown column ['"]([a-z0-9_]+)['"]/i,
    /['"]([a-z0-9_]+)['"] column of ['"].+['"] does not exist/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern) ?? lower.match(pattern);
    if (match?.[1]) return match[1];
  }
  if (
    (lower.includes("schema cache") || lower.includes("does not exist")) &&
    lower.includes("column")
  ) {
    const quoted = message.match(/['"]([a-z0-9_]+)['"]/i);
    if (quoted?.[1]) return quoted[1];
  }
  return null;
}

function isForeignKeyError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("foreign key") ||
    lower.includes("violates foreign key") ||
    lower.includes("23503")
  );
}

function applyMissingColumnFix(current: Row, errorMessage: string): boolean {
  const missing = missingColumnName(errorMessage);
  if (!missing) return false;

  if (remapMissingWriteColumn(current, missing)) {
    console.warn(
      `[supabase-write] remapped/stripped missing column "${missing}"`,
      { keys: Object.keys(current) }
    );
    return true;
  }

  if (missing in current) {
    delete current[missing];
    console.warn(`[supabase-write] stripped missing column "${missing}"`);
    return true;
  }
  return false;
}

function logAttempt(
  op: string,
  table: string,
  attempt: number,
  payload: Row,
  errorMessage?: string
) {
  console.info(`[supabase-write] ${op} ${table} attempt=${attempt}`, {
    keys: Object.keys(payload),
    error: errorMessage ?? null,
  });
}

/**
 * Insert against the live schema. On missing-column / FK drift, remap or
 * strip and retry. Always returns the last Supabase error text (never a
 * vague “تعذر الحفظ” without detail).
 */
export async function insertFlexible<T = Row>(
  table: string,
  payload: Row,
  select = "*"
): Promise<{ data: T | null; error: string | null }> {
  let current = sanitizeUuidFields({ ...payload });
  let lastError = "فشل الحفظ";

  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      logAttempt("insert", table, attempt, current);
      const { data, error } = await supabase
        .from(table)
        .insert(current)
        .select(select)
        .single();

      if (!error) {
        console.info(`[supabase-write] insert ${table} ok`, {
          id: (data as unknown as Row)?.id,
        });
        return { data: data as unknown as T, error: null };
      }

      lastError = error.message;
      console.error(`[supabase-write] insert ${table} failed:`, error.message, {
        keys: Object.keys(current),
      });

      if (applyMissingColumnFix(current, error.message)) continue;

      if (isForeignKeyError(error.message)) {
        let changed = false;
        for (const key of OPTIONAL_FK_KEYS) {
          if (key in current && current[key] != null) {
            if (key === "lesson_id" || key === "cover_image_url") {
              current[key] = null;
              changed = true;
            }
          }
        }
        if (changed) continue;
      }

      if (
        select.includes("(") &&
        (error.message.includes("relationship") ||
          error.message.toLowerCase().includes("column"))
      ) {
        const bare = await supabase
          .from(table)
          .insert(current)
          .select("*")
          .single();
        if (!bare.error) return { data: bare.data as unknown as T, error: null };
        lastError = bare.error.message;
        if (applyMissingColumnFix(current, bare.error.message)) continue;
      }

      return { data: null, error: lastError };
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.error(`[supabase-write] insert ${table} exception:`, err);
  }

  return { data: null, error: lastError };
}

export async function updateFlexible<T = Row>(
  table: string,
  id: string,
  payload: Row,
  select = "*"
): Promise<{ data: T | null; error: string | null }> {
  let current = sanitizeUuidFields({ ...payload });
  let lastError = "فشل التحديث";

  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      logAttempt("update", table, attempt, current);
      const { data, error } = await supabase
        .from(table)
        .update(current)
        .eq("id", id)
        .select(select)
        .single();

      if (!error) {
        console.info(`[supabase-write] update ${table} ok`, { id });
        return { data: data as unknown as T, error: null };
      }

      lastError = error.message;
      console.error(`[supabase-write] update ${table} failed:`, error.message, {
        id,
        keys: Object.keys(current),
      });

      if (applyMissingColumnFix(current, error.message)) continue;

      if (isForeignKeyError(error.message)) {
        if ("lesson_id" in current && current.lesson_id != null) {
          current.lesson_id = null;
          continue;
        }
      }

      if (
        select.includes("(") &&
        (error.message.includes("relationship") ||
          error.message.toLowerCase().includes("column"))
      ) {
        const bare = await supabase
          .from(table)
          .update(current)
          .eq("id", id)
          .select("*")
          .single();
        if (!bare.error) return { data: bare.data as unknown as T, error: null };
        lastError = bare.error.message;
        if (applyMissingColumnFix(current, bare.error.message)) continue;
      }

      return { data: null, error: lastError };
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    console.error(`[supabase-write] update ${table} exception:`, err);
  }

  return { data: null, error: lastError };
}

export { missingColumnName };
