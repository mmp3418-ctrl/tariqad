"use server";

import { revalidatePath } from "next/cache";
import { isMaterialType } from "@/lib/academic";
import { supabase } from "@/lib/supabase";
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

  // Canonical column is file_path; accept legacy pdf_url when reading
  const file_path = String(row.file_path ?? row.pdf_url ?? "").trim();

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    unit_name: String(row.unit_name ?? ""),
    material_type,
    file_path,
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapDbError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("file_path") && (m.includes("column") || m.includes("schema cache"))) {
    return "عمود file_path غير موجود في الجدول. نفّذ supabase/schema.sql لإضافته ثم أعد المحاولة.";
  }
  if (m.includes("pdf_url") && (m.includes("null") || m.includes("not-null"))) {
    return "عمود pdf_url ما زال إلزامياً في قاعدة البيانات. حدّث الجدول أو أعد تشغيل schema.sql.";
  }
  if (m.includes("unit_name") && m.includes("column")) {
    return "عمود unit_name غير موجود. نفّذ supabase/schema.sql ثم أعد المحاولة.";
  }
  return message;
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
      console.error("[materials] getMaterials:", error.message, error);
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
  /** Public Storage URL stored in DB column `file_path` */
  file_path: string;
  stage_id: string;
  grade_id: string;
  is_active: boolean;
};

/**
 * Payload matches DB columns exactly.
 * Writes `file_path` (canonical) and mirrors the same URL to legacy `pdf_url`
 * so older NOT NULL constraints never break inserts.
 */
function buildPayload(input: MaterialInput) {
  const file_path = input.file_path.trim();
  return {
    title: input.title.trim(),
    unit_name: input.unit_name.trim(),
    material_type: input.material_type,
    file_path,
    pdf_url: file_path,
    stage_id: input.stage_id || null,
    grade_id: input.grade_id || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
}

async function persistMaterial(
  mode: "insert" | "update",
  input: MaterialInput,
  id?: string
): Promise<ActionResult<EducationalMaterial>> {
  const base = buildPayload(input);

  const attempt = async (payload: Record<string, unknown>) => {
    if (mode === "insert") {
      const { count } = await supabase
        .from("educational_materials")
        .select("*", { count: "exact", head: true });
      return supabase
        .from("educational_materials")
        .insert({ ...payload, sort_order: count ?? 0 })
        .select("*")
        .single();
    }
    return supabase
      .from("educational_materials")
      .update(payload)
      .eq("id", id!)
      .select("*")
      .single();
  };

  // 1) Preferred: file_path + pdf_url mirror
  let { data, error } = await attempt(base);

  // 2) If file_path column missing in remote schema cache — fall back to pdf_url only
  if (
    error &&
    /file_path/i.test(error.message) &&
    /(column|schema cache|does not exist)/i.test(error.message)
  ) {
    console.warn(
      "[materials] file_path column missing — retrying with pdf_url only"
    );
    const { file_path: _omit, ...legacy } = base;
    const retry = await attempt({ ...legacy, pdf_url: base.file_path });
    data = retry.data;
    error = retry.error;
  }

  // 3) If pdf_url column missing — retry with file_path only
  if (
    error &&
    /pdf_url/i.test(error.message) &&
    /(column|schema cache|does not exist)/i.test(error.message)
  ) {
    console.warn(
      "[materials] pdf_url column missing — retrying with file_path only"
    );
    const { pdf_url: _omit, ...modern } = base;
    const retry = await attempt(modern);
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error("[materials] persistMaterial:", error.message, {
      error,
      mode,
      id,
      payload: base,
    });
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
    if (!input.file_path.trim()) {
      return { success: false, error: "يجب رفع ملف PDF أولاً" };
    }
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "يجب اختيار المرحلة والصف" };
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
    if (!id) return { success: false, error: "معرّف المادة غير صالح" };
    if (!input.title.trim()) {
      return { success: false, error: "العنوان مطلوب" };
    }
    if (!input.unit_name.trim()) {
      return { success: false, error: "اسم الوحدة مطلوب" };
    }
    if (!isMaterialType(input.material_type)) {
      return { success: false, error: "نوع المادة غير صالح" };
    }
    if (!input.file_path.trim()) {
      return { success: false, error: "مسار الملف (file_path) مطلوب" };
    }
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "يجب اختيار المرحلة والصف" };
    }

    return await persistMaterial("update", input, id);
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
    if (!id) return { success: false, error: "معرّف المادة غير صالح" };
    const { data, error } = await supabase
      .from("educational_materials")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[materials] toggleMaterialActive:", error.message, error);
      return { success: false, error: mapDbError(error.message) };
    }
    revalidatePath("/admin/materials");
    return {
      success: true,
      data: normalizeMaterial(data as Record<string, unknown>),
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
    if (!id) return { success: false, error: "معرّف المادة غير صالح" };
    const { error } = await supabase
      .from("educational_materials")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("[materials] deleteMaterial:", error.message, { error, id });
      return { success: false, error: mapDbError(error.message) };
    }
    revalidatePath("/admin/materials");
    return { success: true, message: "تم حذف المادة" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[materials] deleteMaterial exception:", err);
    return { success: false, error: message };
  }
}