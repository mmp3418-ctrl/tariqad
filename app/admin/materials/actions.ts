"use server";

import { revalidatePath } from "next/cache";
import { isMaterialType } from "@/lib/academic";
import {
  arabicDbError,
  isMissingColumnError,
  requireUuid,
  toUuidOrNull,
} from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import { logSupabaseError } from "@/lib/supabase-log";
import type {
  ActionResult,
  EducationalMaterial,
  MaterialType,
} from "@/lib/types";

function normalizeMaterial(row: Record<string, unknown>): EducationalMaterial {
  const rawType = String(row.material_type ?? "كتاب حصة");
  const material_type: MaterialType = isMaterialType(rawType)
    ? rawType
    : "كتاب حصة";

  // Canonical DB column is file_url; accept legacy aliases when reading
  const file_url = String(
    row.file_url ?? row.file_path ?? row.pdf_url ?? ""
  ).trim();

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    unit_name: String(row.unit_name ?? ""),
    material_type,
    file_url,
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    subject_id: row.subject_id ? String(row.subject_id) : null,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapDbError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("file_url") ||
    m.includes("file_path") ||
    m.includes("pdf_url")
  ) {
    return "تعذّر حفظ الملف. تأكد من رفع ملف PDF ثم أعد المحاولة.";
  }
  return arabicDbError(message);
}

export async function getMaterials(): Promise<
  ActionResult<EducationalMaterial[]>
> {
  try {
    const { data, error } = await supabase
      .from("educational_materials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      logSupabaseError("materials.getMaterials", error);
      return { success: false, error: mapDbError(error.message) };
    }

    return {
      success: true,
      data: (data ?? []).map((r) =>
        normalizeMaterial(r as Record<string, unknown>)
      ),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[materials] getMaterials exception:", err);
    return { success: false, error: message };
  }
}

export type MaterialInput = {
  title: string;
  unit_name: string;
  material_type: MaterialType;
  /** Public Storage URL — must map to DB column `file_url` */
  file_url: string;
  stage_id: string;
  grade_id: string;
  subject_id: string;
  is_active: boolean;
};

/** Insertion object uses exact DB column name `file_url`. */
function buildPayload(input: MaterialInput) {
  const file_url = input.file_url.trim();
  return {
    title: input.title.trim(),
    unit_name: input.unit_name.trim(),
    material_type: input.material_type,
    file_url,
    stage_id: toUuidOrNull(input.stage_id),
    grade_id: toUuidOrNull(input.grade_id),
    subject_id: toUuidOrNull(input.subject_id),
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

async function persistMaterial(
  mode: "insert" | "update",
  input: MaterialInput,
  id?: string
): Promise<ActionResult<EducationalMaterial>> {
  const file_url = input.file_url.trim();
  if (!file_url) {
    return {
      success: false,
      error: "ارفع ملف PDF أولاً قبل الحفظ.",
    };
  }

  const payload = buildPayload({ ...input, file_url });

  const run = async (body: Record<string, unknown>) => {
    if (mode === "insert") {
      const { count } = await supabase
        .from("educational_materials")
        .select("*", { count: "exact", head: true });
      return supabase
        .from("educational_materials")
        .insert({ ...body, sort_order: count ?? 0 })
        .select("*")
        .single();
    }
    return supabase
      .from("educational_materials")
      .update(body)
      .eq("id", id!)
      .select("*")
      .single();
  };

  console.info("[materials] persist payload keys:", Object.keys(payload), {
    file_url: payload.file_url,
    mode,
  });

  let { data, error } = await run(payload);

  // Soft-retry if subject_id column not yet migrated
  if (
    error &&
    /subject_id/i.test(error.message) &&
    isMissingColumnError(error.message, "subject_id")
  ) {
    const { subject_id: _omit, ...withoutSubject } = payload;
    const retry = await run(withoutSubject);
    data = retry.data;
    error = retry.error;
  }

  // Legacy fallbacks if remote table still uses older column names
  if (
    error &&
    /file_url/i.test(error.message) &&
    /(column|schema cache|does not exist)/i.test(error.message)
  ) {
    console.warn("[materials] file_url missing — retry pdf_url / file_path");
    const { file_url: url, ...rest } = payload;
    const legacyAttempts = [
      { ...rest, pdf_url: url },
      { ...rest, file_path: url },
      { ...rest, file_url: url, pdf_url: url },
    ];
    for (const attempt of legacyAttempts) {
      const retry = await run(attempt);
      if (!retry.error) {
        data = retry.data;
        error = null;
        break;
      }
      error = retry.error;
    }
  }

  if (error) {
    logSupabaseError("materials.persistMaterial", error, { mode, id });
    return { success: false, error: mapDbError(error.message) };
  }

  revalidatePath("/admin/materials");
  return {
    success: true,
    data: normalizeMaterial(data as Record<string, unknown>),
    message:
      mode === "insert"
        ? "تمت إضافة المادة التعليمية بنجاح"
        : "تم تحديث المادة التعليمية بنجاح",
  };
}

export async function createMaterial(
  input: MaterialInput
): Promise<ActionResult<EducationalMaterial>> {
  try {
    if (!input.title.trim()) {
      return { success: false, error: "العنوان مطلوب" };
    }
    if (!input.unit_name.trim()) {
      return { success: false, error: "اسم الوحدة مطلوب" };
    }
    if (!isMaterialType(input.material_type)) {
      return { success: false, error: "نوع المادة غير صالح" };
    }
    if (!input.file_url?.trim()) {
      return { success: false, error: "يجب رفع ملف PDF أولاً." };
    }
    if (!toUuidOrNull(input.stage_id) || !toUuidOrNull(input.grade_id)) {
      return {
        success: false,
        error: "يرجى اختيار المرحلة والصف قبل الحفظ.",
      };
    }
    if (!toUuidOrNull(input.subject_id)) {
      return {
        success: false,
        error: "يرجى اختيار المادة الدراسية قبل الحفظ.",
      };
    }

    return await persistMaterial("insert", input);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[materials] createMaterial exception:", err);
    return { success: false, error: message };
  }
}

export async function updateMaterial(
  id: string,
  input: MaterialInput
): Promise<ActionResult<EducationalMaterial>> {
  try {
    const checked = requireUuid(id, "معرّف المادة");
    if (!checked.ok) return { success: false, error: checked.error };
    if (!input.title.trim()) {
      return { success: false, error: "العنوان مطلوب" };
    }
    if (!input.unit_name.trim()) {
      return { success: false, error: "اسم الوحدة مطلوب" };
    }
    if (!isMaterialType(input.material_type)) {
      return { success: false, error: "نوع المادة غير صالح" };
    }
    if (!input.file_url?.trim()) {
      return { success: false, error: "رابط الملف مطلوب. ارفع ملف PDF أولاً." };
    }
    if (!toUuidOrNull(input.stage_id) || !toUuidOrNull(input.grade_id)) {
      return {
        success: false,
        error: "يرجى اختيار المرحلة والصف قبل الحفظ.",
      };
    }
    if (!toUuidOrNull(input.subject_id)) {
      return {
        success: false,
        error: "يرجى اختيار المادة الدراسية قبل الحفظ.",
      };
    }

    return await persistMaterial("update", input, checked.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[materials] updateMaterial exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleMaterialActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<EducationalMaterial>> {
  try {
    const checked = requireUuid(id, "معرّف المادة");
    if (!checked.ok) return { success: false, error: checked.error };

    let result = await supabase
      .from("educational_materials")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", checked.id)
      .select("*")
      .single();

    if (
      result.error &&
      isMissingColumnError(result.error.message, "updated_at")
    ) {
      result = await supabase
        .from("educational_materials")
        .update({ is_active })
        .eq("id", checked.id)
        .select("*")
        .single();
    }

    if (result.error) {
      logSupabaseError("materials.toggleMaterialActive", result.error, {
        id: checked.id,
      });
      return {
        success: false,
        error: arabicDbError(mapDbError(result.error.message)),
      };
    }
    revalidatePath("/admin/materials");
    return {
      success: true,
      data: normalizeMaterial(result.data as Record<string, unknown>),
      message: is_active ? "تم تفعيل المادة" : "تم إيقاف المادة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[materials] toggleMaterialActive exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteMaterial(id: string): Promise<ActionResult> {
  try {
    const checked = requireUuid(id, "معرّف المادة");
    if (!checked.ok) return { success: false, error: checked.error };
    const { error } = await supabase
      .from("educational_materials")
      .delete()
      .eq("id", checked.id);
    if (error) {
      logSupabaseError("materials.deleteMaterial", error, { id: checked.id });
      return { success: false, error: arabicDbError(mapDbError(error.message)) };
    }
    revalidatePath("/admin/materials");
    return { success: true, message: "تم حذف المادة" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[materials] deleteMaterial exception:", err);
    return { success: false, error: message };
  }
}