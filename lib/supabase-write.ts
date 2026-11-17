import { supabase } from "@/lib/supabase";

type Row = Record<string, unknown>;

const OPTIONAL_FK_KEYS = [
  "lesson_id",
  "unit_id",
  "grade_id",
  "cover_image_url",
] as const;

/** Empty strings break uuid FK columns — coerce to null. */
export function sanitizeUuidFields<T extends Row>(row: T): T {
  const next = { ...row };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (value === "" || value === undefined) {
      if (
        key.endsWith("_id") ||
        key === "cover_image_url" ||
        key === "description_ar" ||
        key === "description_en"
      ) {
        (next as Row)[key] = null;
      }
    }
  }
  return next;
}

function missingColumnName(message: string): string | null {
  const lower = message.toLowerCase();
  // PostgREST / Postgres variants
  const patterns = [
    /column ["']?([a-z0-9_]+)["']? of relation/i,
    /could not find the ['"]([a-z0-9_]+)['"] column/i,
    /unknown column ['"]([a-z0-9_]+)['"]/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern) ?? lower.match(pattern);
    if (match?.[1]) return match[1];
  }
  if (lower.includes("schema cache") && lower.includes("column")) {
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

/**
 * Insert with progressive stripping of unknown columns / empty FKs
 * so forms keep working across schema drift.
 */
export async function insertFlexible<T = Row>(
  table: string,
  payload: Row,
  select = "*"
): Promise<{ data: T | null; error: string | null }> {
  let current = sanitizeUuidFields({ ...payload });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .insert(current)
      .select(select)
      .single();

    if (!error) return { data: data as T, error: null };

    const missing = missingColumnName(error.message);
    if (missing && missing in current) {
      delete current[missing];
      continue;
    }

    if (isForeignKeyError(error.message)) {
      let changed = false;
      for (const key of OPTIONAL_FK_KEYS) {
        if (key in current && current[key] != null) {
          // Prefer nulling optional FKs that often cause 23503 when stale/empty
          if (key === "lesson_id" || key === "cover_image_url") {
            current[key] = null;
            changed = true;
          }
        }
      }
      if (changed) continue;
    }

    // Select join failed after insert — retry insert with bare *
    if (
      attempt === 0 &&
      select.includes("(") &&
      (error.message.includes("relationship") ||
        error.message.toLowerCase().includes("column"))
    ) {
      const bare = await supabase.from(table).insert(current).select("*").single();
      if (!bare.error) return { data: bare.data as T, error: null };
    }

    return { data: null, error: error.message };
  }

  return { data: null, error: "تعذر الحفظ بعد عدة محاولات" };
}

export async function updateFlexible<T = Row>(
  table: string,
  id: string,
  payload: Row,
  select = "*"
): Promise<{ data: T | null; error: string | null }> {
  let current = sanitizeUuidFields({ ...payload });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .update(current)
      .eq("id", id)
      .select(select)
      .single();

    if (!error) return { data: data as T, error: null };

    const missing = missingColumnName(error.message);
    if (missing && missing in current) {
      delete current[missing];
      continue;
    }

    if (isForeignKeyError(error.message)) {
      if ("lesson_id" in current && current.lesson_id != null) {
        current.lesson_id = null;
        continue;
      }
    }

    if (
      attempt === 0 &&
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
      if (!bare.error) return { data: bare.data as T, error: null };
    }

    return { data: null, error: error.message };
  }

  return { data: null, error: "تعذر التحديث بعد عدة محاولات" };
}
