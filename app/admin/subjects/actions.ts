"use server";

import { revalidatePath } from "next/cache";
import { arabicDbError, requireUuid, toUuidOrNull } from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import type { ActionResult, Subject } from "@/lib/types";

type PgErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function logPgError(scope: string, error: PgErrorLike) {
  console.error(`[subjects] ${scope}:`, {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });
}

/**
 * Live schema uses stage_id / grade_id (canonical).
 * Older drafts used stage / grade — normalize both when reading.
 */
function normalizeSubject(row: Record<string, unknown>): Subject {
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

/** Build insert/update body for the live column names. */
function buildSubjectBody(input: {
  name_ar: string;
  name_en: string | null;
  stage: string;
  grade: string;
}) {
  // name_en is NOT NULL with default '' on many deployments — never send null.
  return {
    name_ar: input.name_ar,
    name_en: input.name_en ?? "",
    name: input.name_ar,
    stage_id: input.stage,
    grade_id: input.grade,
    updated_at: new Date().toISOString(),
  };
}

/** Legacy body if stage_id/grade_id columns are missing. */
function buildLegacySubjectBody(input: {
  name_ar: string;
  name_en: string | null;
  stage: string;
  grade: string;
}) {
  return {
    name_ar: input.name_ar,
    name_en: input.name_en ?? "",
    name: input.name_ar,
    stage: input.stage,
    grade: input.grade,
    updated_at: new Date().toISOString(),
  };
}

function isMissingCol(message: string, column: string): boolean {
  return (
    new RegExp(column, "i").test(message) &&
    /(column|schema cache|does not exist)/i.test(message)
  );
}

export async function getSubjects(): Promise<ActionResult<Subject[]>> {
  try {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("name_ar", { ascending: true });

    if (error) {
      logPgError("getSubjects", error);
      return { success: false, error: arabicDbError(error.message) };
    }

    return {
      success: true,
      data: (data ?? []).map((r) =>
        normalizeSubject(r as Record<string, unknown>),
      ),
    };
  } catch (err) {
    console.error("[subjects] getSubjects exception:", err);
    return {
      success: false,
      error: "تعذّر تحميل المواد الدراسية حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}

export type SubjectInput = {
  name_ar: string;
  name_en?: string;
  stage: string;
  grade: string;
};

export async function createSubject(
  input: SubjectInput,
): Promise<ActionResult<Subject>> {
  try {
    const name_ar = input.name_ar.trim();
    const name_en = String(input.name_en ?? "").trim() || null;
    const stage = toUuidOrNull(input.stage);
    const grade = toUuidOrNull(input.grade);

    if (!name_ar) {
      return { success: false, error: "اسم المادة بالعربية مطلوب." };
    }
    if (!stage || !grade) {
      return {
        success: false,
        error: "يرجى اختيار المرحلة والصف قبل الحفظ.",
      };
    }

    const primary = buildSubjectBody({ name_ar, name_en, stage, grade });
    let { data, error } = await supabase
      .from("subjects")
      .insert(primary)
      .select("*")
      .single();

    // Fallback: live table may still use stage/grade column names
    if (
      error &&
      (isMissingCol(error.message, "stage_id") ||
        isMissingCol(error.message, "grade_id") ||
        isMissingCol(error.message, "name"))
    ) {
      logPgError("createSubject primary failed — retry legacy columns", error);
      const legacy = buildLegacySubjectBody({
        name_ar,
        name_en,
        stage,
        grade,
      });
      const retry = await supabase
        .from("subjects")
        .insert(legacy)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      logPgError("createSubject", error);
      return { success: false, error: arabicDbError(error.message) };
    }

    revalidatePath("/admin/materials");
    revalidatePath("/admin/playlists");
    return {
      success: true,
      data: normalizeSubject(data as Record<string, unknown>),
      message: "تمت إضافة المادة الدراسية",
    };
  } catch (err) {
    console.error("[subjects] createSubject exception:", err);
    return {
      success: false,
      error: "تعذّر حفظ المادة الدراسية حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}

export async function updateSubject(
  id: string,
  input: SubjectInput,
): Promise<ActionResult<Subject>> {
  try {
    const checked = requireUuid(id, "معرّف المادة");
    if (!checked.ok) return { success: false, error: checked.error };

    const name_ar = input.name_ar.trim();
    const name_en = String(input.name_en ?? "").trim() || null;
    const stage = toUuidOrNull(input.stage);
    const grade = toUuidOrNull(input.grade);

    if (!name_ar) {
      return { success: false, error: "اسم المادة بالعربية مطلوب." };
    }
    if (!stage || !grade) {
      return {
        success: false,
        error: "يرجى اختيار المرحلة والصف قبل الحفظ.",
      };
    }

    const primary = buildSubjectBody({ name_ar, name_en, stage, grade });
    let { data, error } = await supabase
      .from("subjects")
      .update(primary)
      .eq("id", checked.id)
      .select("*")
      .single();

    if (
      error &&
      (isMissingCol(error.message, "stage_id") ||
        isMissingCol(error.message, "grade_id") ||
        isMissingCol(error.message, "name"))
    ) {
      logPgError("updateSubject primary failed — retry legacy columns", error);
      const legacy = buildLegacySubjectBody({
        name_ar,
        name_en,
        stage,
        grade,
      });
      const retry = await supabase
        .from("subjects")
        .update(legacy)
        .eq("id", checked.id)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      logPgError("updateSubject", error);
      return { success: false, error: arabicDbError(error.message) };
    }

    revalidatePath("/admin/materials");
    revalidatePath("/admin/playlists");
    return {
      success: true,
      data: normalizeSubject(data as Record<string, unknown>),
      message: "تم تحديث المادة الدراسية",
    };
  } catch (err) {
    console.error("[subjects] updateSubject exception:", err);
    return {
      success: false,
      error: "تعذّر تحديث المادة الدراسية حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  try {
    const checked = requireUuid(id, "معرّف المادة");
    if (!checked.ok) return { success: false, error: checked.error };

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", checked.id);

    if (error) {
      logPgError("deleteSubject", error);
      return { success: false, error: arabicDbError(error.message) };
    }

    revalidatePath("/admin/materials");
    revalidatePath("/admin/playlists");
    return { success: true, message: "تم حذف المادة الدراسية" };
  } catch (err) {
    console.error("[subjects] deleteSubject exception:", err);
    return {
      success: false,
      error: "تعذّر حذف المادة الدراسية حالياً، يرجى المحاولة لاحقاً.",
    };
  }
}
