/**
 * Unified subjects service — single source of truth for create / update /
 * delete / list against public.subjects.
 *
 * Live Supabase schema quirk (confirmed via REST insert):
 *   stage_id / grade_id  → uuid FKs (canonical)
 *   stage / grade        → legacy text columns that are still NOT NULL
 * Writing only stage_id/grade_id fails with 23502 on "stage".
 * This service always mirrors UUID values into both column pairs.
 */

import {
  isMissingColumnError,
  requireUuid,
  STAGE_GRADE_REQUIRED,
  toUuidOrNull,
} from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import { logSupabaseError } from "@/lib/supabase-log";
import type { ActionResult, Subject } from "@/lib/types";

export type SubjectInput = {
  name_ar: string;
  name_en?: string;
  /** academic_stages.id (uuid) */
  stage: string;
  /** academic_grades.id (uuid) */
  grade: string;
};

export type SubjectFilter = {
  stageId?: string | null;
  gradeId?: string | null;
};

/** Alias used by server actions */
export type SubjectListFilter = SubjectFilter;

type SbError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

/** Map subjects-specific DB errors to clear Arabic (not the generic dump). */
export function subjectDbError(error: SbError | string | null | undefined): string {
  const message =
    typeof error === "string" ? error : String(error?.message ?? "").trim();
  const code = typeof error === "string" ? "" : String(error?.code ?? "");
  const details =
    typeof error === "string" ? "" : String(error?.details ?? "").trim();
  const text = `${message} ${details}`.trim();

  if (!text) return "تعذّر إتمام العملية على المواد الدراسية.";

  if (
    /null value in column "stage"/i.test(text) ||
    /null value in column "grade"/i.test(text)
  ) {
    return STAGE_GRADE_REQUIRED;
  }

  if (
    code === "23503" ||
    /foreign key|violates foreign key/i.test(text)
  ) {
    return "المرحلة أو الصف المحدد غير موجود في قاعدة البيانات.";
  }

  if (code === "23502" || /null value in column/i.test(text)) {
    const col = text.match(/column "([^"]+)"/i)?.[1];
    if (col === "name_ar" || col === "name") {
      return "اسم المادة بالعربية مطلوب.";
    }
    return col
      ? `حقل إلزامي ناقص في قاعدة البيانات: ${col}`
      : "حقل إلزامي ناقص في قاعدة البيانات.";
  }

  if (code === "23505" || /duplicate key|unique constraint/i.test(text)) {
    return "هذه المادة موجودة مسبقاً لنفس المرحلة والصف.";
  }

  if (
    code === "42501" ||
    /row-level security|permission denied|jwt/i.test(text)
  ) {
    return "لا توجد صلاحية لحفظ المواد الدراسية (تحقق من سياسات RLS).";
  }

  if (/invalid input syntax for type uuid/i.test(text)) {
    return "معرّف المرحلة أو الصف غير صالح. حدّث الصفحة واخترهما من جديد.";
  }

  if (isMissingColumnError(text, "subjects") || /relation .*subjects/i.test(text)) {
    return "جدول المواد الدراسية غير موجود. نفّذ سكربت المخطط في Supabase.";
  }

  if (
    isMissingColumnError(text, "name_ar") ||
    isMissingColumnError(text, "stage_id") ||
    isMissingColumnError(text, "grade_id")
  ) {
    return "أعمدة جدول المواد غير متوافقة مع التطبيق. نفّذ supabase_unified_schema.sql.";
  }

  // Prefer details when message is opaque
  if (message && !/^[a-z0-9_.\s-]+$/i.test(message)) {
    return message;
  }

  return details || message || "تعذّر إتمام العملية على المواد الدراسية.";
}

export function normalizeSubject(row: Record<string, unknown>): Subject {
  const stage = String(row.stage_id ?? row.stage ?? "").trim();
  const grade = String(row.grade_id ?? row.grade ?? "").trim();
  const nameEn = String(row.name_en ?? "").trim();
  return {
    id: String(row.id),
    name_ar: String(row.name_ar ?? row.name ?? "").trim(),
    name_en: nameEn || null,
    stage,
    grade,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/**
 * Payload written on insert/update.
 * Mirrors stage/grade into both uuid + legacy text columns.
 */
export function buildSubjectWritePayload(input: {
  name_ar: string;
  name_en: string;
  stageId: string;
  gradeId: string;
}): Record<string, unknown> {
  return {
    name_ar: input.name_ar,
    name_en: input.name_en,
    name: input.name_ar,
    stage_id: input.stageId,
    grade_id: input.gradeId,
    // Legacy NOT NULL text columns — same UUID string values
    stage: input.stageId,
    grade: input.gradeId,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
}

async function persistWithColumnFallback(
  mode: "insert" | "update",
  payload: Record<string, unknown>,
  id?: string,
): Promise<{ data: Record<string, unknown> | null; error: SbError | null }> {
  const attempt = async (body: Record<string, unknown>) => {
    if (mode === "insert") {
      return supabase.from("subjects").insert(body).select("*").single();
    }
    return supabase
      .from("subjects")
      .update(body)
      .eq("id", id!)
      .select("*")
      .single();
  };

  let body = { ...payload };
  let result = await attempt(body);

  // Strip optional columns that are absent from schema cache (never stage/grade keys).
  const stripOrder = ["updated_at", "name", "name_en", "is_active", "sort_order"];

  for (const col of stripOrder) {
    if (!result.error) break;
    const msg = result.error.message ?? "";
    // Only strip when the column truly does not exist — not NOT NULL / FK errors.
    if (
      !isMissingColumnError(msg, col) ||
      !/(does not exist|schema cache)/i.test(msg)
    ) {
      continue;
    }
    if (!(col in body)) continue;
    logSupabaseError(`subjects.${mode}.missing.${col}`, result.error);
    const { [col]: _omit, ...rest } = body;
    body = rest;
    result = await attempt(body);
  }

  // If still failing because ONLY legacy columns exist as required and uuid
  // columns were stripped somehow — rebuild legacy-only payload
  if (
    result.error &&
    (/null value in column "stage"/i.test(result.error.message ?? "") ||
      /null value in column "grade"/i.test(result.error.message ?? ""))
  ) {
    const legacy = {
      name_ar: payload.name_ar,
      name_en: payload.name_en ?? "",
      name: payload.name ?? payload.name_ar,
      stage: payload.stage ?? payload.stage_id,
      grade: payload.grade ?? payload.grade_id,
      updated_at: payload.updated_at,
    };
    logSupabaseError(`subjects.${mode}.legacy_retry`, result.error);
    result = await attempt(legacy);
  }

  return {
    data: (result.data as Record<string, unknown> | null) ?? null,
    error: result.error
      ? {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code,
        }
      : null,
  };
}

function validateInput(
  input: SubjectInput,
): ActionResult<{ name_ar: string; name_en: string; stageId: string; gradeId: string }> {
  const name_ar = String(input.name_ar ?? "").trim();
  const name_en = String(input.name_en ?? "").trim();
  const stageId = toUuidOrNull(input.stage);
  const gradeId = toUuidOrNull(input.grade);

  if (!name_ar) {
    return { success: false, error: "اسم المادة بالعربية مطلوب." };
  }
  if (!stageId || !gradeId) {
    return { success: false, error: STAGE_GRADE_REQUIRED };
  }

  return {
    success: true,
    data: { name_ar, name_en, stageId, gradeId },
  };
}

export async function listSubjects(
  filter: SubjectFilter = {},
): Promise<ActionResult<Subject[]>> {
  try {
    let query = supabase.from("subjects").select("*");

    const stageId = toUuidOrNull(filter.stageId);
    const gradeId = toUuidOrNull(filter.gradeId);
    if (stageId) {
      // Match either canonical or legacy column
      query = query.or(`stage_id.eq.${stageId},stage.eq.${stageId}`);
    }
    if (gradeId) {
      query = query.or(`grade_id.eq.${gradeId},grade.eq.${gradeId}`);
    }

    const ordered = await query.order("name_ar", { ascending: true });
    let data = ordered.data;
    let error = ordered.error;

    // Fallback order if name_ar missing from schema cache
    if (error && isMissingColumnError(error.message, "name_ar")) {
      logSupabaseError("subjects.listSubjects.order", error);
      const retry = await supabase.from("subjects").select("*");
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      logSupabaseError("subjects.listSubjects", error);
      return { success: false, error: subjectDbError(error) };
    }

    return {
      success: true,
      data: (data ?? []).map((r) =>
        normalizeSubject(r as Record<string, unknown>),
      ),
    };
  } catch (err) {
    console.error("[subjects.listSubjects] exception:", err);
    return {
      success: false,
      error: "تعذّر تحميل المواد الدراسية حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}

export async function createSubjectRecord(
  input: SubjectInput,
): Promise<ActionResult<Subject>> {
  try {
    const checked = validateInput(input);
    if (!checked.success) return checked;
    if (!checked.data) {
      return { success: false, error: "بيانات المادة غير صالحة." };
    }

    const payload = buildSubjectWritePayload(checked.data);
    const { data, error } = await persistWithColumnFallback("insert", payload);

    if (error || !data) {
      logSupabaseError("subjects.createSubjectRecord", error);
      return { success: false, error: subjectDbError(error) };
    }

    return {
      success: true,
      data: normalizeSubject(data),
      message: "تمت إضافة المادة الدراسية",
    };
  } catch (err) {
    console.error("[subjects.createSubjectRecord] exception:", err);
    return {
      success: false,
      error: "تعذّر حفظ المادة الدراسية حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}

export async function updateSubjectRecord(
  id: string,
  input: SubjectInput,
): Promise<ActionResult<Subject>> {
  try {
    const idCheck = requireUuid(id, "معرّف المادة");
    if (!idCheck.ok) return { success: false, error: idCheck.error };

    const checked = validateInput(input);
    if (!checked.success) return checked;
    if (!checked.data) {
      return { success: false, error: "بيانات المادة غير صالحة." };
    }

    const payload = buildSubjectWritePayload(checked.data);
    const { data, error } = await persistWithColumnFallback(
      "update",
      payload,
      idCheck.id,
    );

    if (error || !data) {
      logSupabaseError("subjects.updateSubjectRecord", error);
      return { success: false, error: subjectDbError(error) };
    }

    return {
      success: true,
      data: normalizeSubject(data),
      message: "تم تحديث المادة الدراسية",
    };
  } catch (err) {
    console.error("[subjects.updateSubjectRecord] exception:", err);
    return {
      success: false,
      error: "تعذّر تحديث المادة الدراسية حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}

export async function deleteSubjectRecord(id: string): Promise<ActionResult> {
  try {
    const idCheck = requireUuid(id, "معرّف المادة");
    if (!idCheck.ok) return { success: false, error: idCheck.error };

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", idCheck.id);

    if (error) {
      logSupabaseError("subjects.deleteSubjectRecord", error);
      return { success: false, error: subjectDbError(error) };
    }

    return { success: true, message: "تم حذف المادة الدراسية" };
  } catch (err) {
    console.error("[subjects.deleteSubjectRecord] exception:", err);
    return {
      success: false,
      error: "تعذّر حذف المادة الدراسية حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}
