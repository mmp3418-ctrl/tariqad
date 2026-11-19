"use server";

import { revalidatePath } from "next/cache";
import {
  arabicDbError,
  isMissingColumnError,
  isUuid,
} from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import type {
  ActionResult,
  SiteTimetableStatus,
  SiteToolSetting,
} from "@/lib/types";

const GRADE_CALCULATOR_KEY = "grade_calculator";
const TIMETABLE_STATUS_KEY = "default";

const TOOL_NAMES: Record<string, string> = {
  grade_calculator: "آلة حساب الدرجات",
};

function normalizeTool(row: Record<string, unknown>): SiteToolSetting {
  const key = String(row.tool_key ?? "");
  return {
    id: String(row.id ?? ""),
    tool_key: key,
    tool_name:
      (row.tool_name ? String(row.tool_name) : null) ||
      TOOL_NAMES[key] ||
      key,
    is_active: row.is_active !== false,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function normalizeTimetableStatus(
  row: Record<string, unknown>
): SiteTimetableStatus {
  return {
    id: String(row.id ?? ""),
    status_key: String(row.status_key ?? TIMETABLE_STATUS_KEY),
    is_active: row.is_active !== false,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function revalidateTools() {
  revalidatePath("/admin/teacher/tools");
  revalidatePath("/admin/teacher");
  revalidatePath("/admin/teacher-space");
}

function nowIso() {
  return new Date().toISOString();
}

/** Upsert tool row; retry without optional columns if schema is older. */
async function upsertToolRow(body: {
  tool_key: string;
  tool_name?: string;
  is_active: boolean;
  updated_at: string;
}) {
  let result = await supabase
    .from("site_tool_settings")
    .upsert(body, { onConflict: "tool_key" })
    .select("*")
    .single();

  if (
    result.error &&
    isMissingColumnError(result.error.message, "tool_name")
  ) {
    const { tool_name: _n, ...rest } = body;
    result = await supabase
      .from("site_tool_settings")
      .upsert(rest, { onConflict: "tool_key" })
      .select("*")
      .single();
  }

  if (
    result.error &&
    isMissingColumnError(result.error.message, "updated_at")
  ) {
    const { updated_at: _u, tool_name: _n, ...rest } = body;
    result = await supabase
      .from("site_tool_settings")
      .upsert(rest, { onConflict: "tool_key" })
      .select("*")
      .single();
  }

  return result;
}

export async function getToolSettings(): Promise<
  ActionResult<SiteToolSetting[]>
> {
  try {
    const existing = await supabase
      .from("site_tool_settings")
      .select("*")
      .eq("tool_key", GRADE_CALCULATOR_KEY)
      .maybeSingle();
    if (existing.error) {
      return { success: false, error: arabicDbError(existing.error.message) };
    }
    if (!existing.data) {
      const inserted = await upsertToolRow({
        tool_key: GRADE_CALCULATOR_KEY,
        tool_name: TOOL_NAMES[GRADE_CALCULATOR_KEY],
        is_active: true,
        updated_at: nowIso(),
      });
      if (inserted.error) {
        return { success: false, error: arabicDbError(inserted.error.message) };
      }
    }
    const { data, error } = await supabase
      .from("site_tool_settings")
      .select("*")
      .order("tool_key", { ascending: true });
    if (error) return { success: false, error: arabicDbError(error.message) };
    return {
      success: true,
      data: (data ?? []).map((row) =>
        normalizeTool(row as Record<string, unknown>)
      ),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function setToolActive(
  toolKey: string,
  is_active: boolean
): Promise<ActionResult<SiteToolSetting>> {
  try {
    const key = toolKey.trim();
    if (!key) return { success: false, error: "مفتاح الأداة غير صالح" };

    const { data, error } = await upsertToolRow({
      tool_key: key,
      tool_name: TOOL_NAMES[key] || key,
      is_active,
      updated_at: nowIso(),
    });
    if (error) return { success: false, error: arabicDbError(error.message) };

    if (key === GRADE_CALCULATOR_KEY) {
      // teacher_space_settings.id is integer 1 (not uuid) — safe
      await supabase.from("teacher_space_settings").upsert({
        id: 1,
        grade_calculator_active: is_active,
        updated_at: nowIso(),
      });
    }

    revalidateTools();
    return {
      success: true,
      data: normalizeTool(data as Record<string, unknown>),
      message:
        key === GRADE_CALCULATOR_KEY
          ? is_active
            ? "تم تفعيل آلة حساب الدرجات"
            : "تم إيقاف آلة حساب الدرجات"
          : is_active
            ? "تم تفعيل الأداة"
            : "تم إيقاف الأداة",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Load timetable visibility without ever querying uuid id = "1".
 * Prefer status_key = 'default'; fall back to first row.
 */
async function loadTimetableRow(): Promise<{
  data: Record<string, unknown> | null;
  error: string | null;
}> {
  const byKey = await supabase
    .from("site_timetable_status")
    .select("*")
    .eq("status_key", TIMETABLE_STATUS_KEY)
    .maybeSingle();

  if (!byKey.error) {
    return {
      data: (byKey.data as Record<string, unknown> | null) ?? null,
      error: null,
    };
  }

  // Legacy table without status_key — never use .eq('id', 1) on uuid PKs
  if (isMissingColumnError(byKey.error.message, "status_key")) {
    const any = await supabase
      .from("site_timetable_status")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (any.error) {
      return { data: null, error: arabicDbError(any.error.message) };
    }
    return {
      data: (any.data as Record<string, unknown> | null) ?? null,
      error: null,
    };
  }

  // Also handle invalid uuid "1" from older clients hitting uuid id
  if (/invalid input syntax for type uuid/i.test(byKey.error.message)) {
    const any = await supabase
      .from("site_timetable_status")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (any.error) {
      return { data: null, error: arabicDbError(any.error.message) };
    }
    return {
      data: (any.data as Record<string, unknown> | null) ?? null,
      error: null,
    };
  }

  return { data: null, error: arabicDbError(byKey.error.message) };
}

async function ensureTimetableRow(): Promise<
  ActionResult<SiteTimetableStatus>
> {
  const loaded = await loadTimetableRow();
  if (loaded.error) return { success: false, error: loaded.error };
  if (loaded.data) {
    return { success: true, data: normalizeTimetableStatus(loaded.data) };
  }

  // Insert without hardcoded id (works for uuid PK + status_key)
  let inserted = await supabase
    .from("site_timetable_status")
    .insert({
      status_key: TIMETABLE_STATUS_KEY,
      is_active: true,
      updated_at: nowIso(),
    })
    .select("*")
    .single();

  if (
    inserted.error &&
    isMissingColumnError(inserted.error.message, "status_key")
  ) {
    // Legacy integer table: insert active flag only (id default 1 if integer)
    inserted = await supabase
      .from("site_timetable_status")
      .insert({ is_active: true, updated_at: nowIso() })
      .select("*")
      .single();
  }

  if (
    inserted.error &&
    isMissingColumnError(inserted.error.message, "updated_at")
  ) {
    inserted = await supabase
      .from("site_timetable_status")
      .insert({ status_key: TIMETABLE_STATUS_KEY, is_active: true })
      .select("*")
      .single();
  }

  if (inserted.error) {
    // Race: row created elsewhere — re-read
    const again = await loadTimetableRow();
    if (again.data) {
      return { success: true, data: normalizeTimetableStatus(again.data) };
    }
    return { success: false, error: arabicDbError(inserted.error.message) };
  }

  return {
    success: true,
    data: normalizeTimetableStatus(inserted.data as Record<string, unknown>),
  };
}

export async function getSiteTimetableStatus(): Promise<
  ActionResult<SiteTimetableStatus>
> {
  try {
    return await ensureTimetableRow();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function setSiteTimetableActive(
  is_active: boolean
): Promise<ActionResult<SiteTimetableStatus>> {
  try {
    const ensured = await ensureTimetableRow();
    if (!ensured.success || !ensured.data) {
      return {
        success: false,
        error: ensured.success === false ? ensured.error : "تعذر تهيئة حالة الجدول",
      };
    }

    const rowId = ensured.data.id;
    const payloadBase = {
      is_active: is_active !== false,
      updated_at: nowIso(),
    };

    async function finish(
      row: Record<string, unknown>
    ): Promise<ActionResult<SiteTimetableStatus>> {
      revalidateTools();
      return {
        success: true,
        data: normalizeTimetableStatus(row),
        message: is_active
          ? "تم عرض جدول الحصص العام في المنصة"
          : "تم إخفاء جدول الحصص العام عن المنصة",
      };
    }

    // Update by real PK: UUID string OR legacy integer id (never send "1" to a uuid column blindly)
    const canEqId = isUuid(rowId) || /^\d+$/.test(rowId);
    if (canEqId && isUuid(rowId)) {
      let updated = await supabase
        .from("site_timetable_status")
        .update({ ...payloadBase, status_key: TIMETABLE_STATUS_KEY })
        .eq("id", rowId)
        .select("*")
        .single();

      if (
        updated.error &&
        isMissingColumnError(updated.error.message, "status_key")
      ) {
        updated = await supabase
          .from("site_timetable_status")
          .update(payloadBase)
          .eq("id", rowId)
          .select("*")
          .single();
      }

      if (
        updated.error &&
        isMissingColumnError(updated.error.message, "updated_at")
      ) {
        updated = await supabase
          .from("site_timetable_status")
          .update({ is_active: payloadBase.is_active })
          .eq("id", rowId)
          .select("*")
          .single();
      }

      if (!updated.error && updated.data) {
        return finish(updated.data as Record<string, unknown>);
      }
    } else if (canEqId && /^\d+$/.test(rowId)) {
      // Legacy integer PK table — numeric id is safe
      const updated = await supabase
        .from("site_timetable_status")
        .update(payloadBase)
        .eq("id", Number(rowId))
        .select("*")
        .single();
      if (!updated.error && updated.data) {
        return finish(updated.data as Record<string, unknown>);
      }
    }

    // Upsert by status_key (never id: 1)
    let upserted = await supabase
      .from("site_timetable_status")
      .upsert(
        { ...payloadBase, status_key: TIMETABLE_STATUS_KEY },
        { onConflict: "status_key" }
      )
      .select("*")
      .single();

    if (
      upserted.error &&
      isMissingColumnError(upserted.error.message, "status_key")
    ) {
      const fallback = await supabase
        .from("site_timetable_status")
        .update(payloadBase)
        .select("*")
        .limit(1);
      if (fallback.error) {
        return { success: false, error: arabicDbError(fallback.error.message) };
      }
      const row = (fallback.data ?? [])[0];
      if (!row) {
        return { success: false, error: "لم يتم العثور على سجل حالة الجدول" };
      }
      return finish(row as Record<string, unknown>);
    }

    if (upserted.error) {
      return { success: false, error: arabicDbError(upserted.error.message) };
    }

    return finish(upserted.data as Record<string, unknown>);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
