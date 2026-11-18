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

  const file_path = String(
    row.file_path ?? row.pdf_url ?? ""
  );

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
      return { success: false, error: error.message };
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
  file_path: string;
  stage_id: string;
  grade_id: string;
  is_active: boolean;
};

function buildPayload(input: MaterialInput) {
  return {
    title: input.title.trim(),
    unit_name: input.unit_name.trim(),
    material_type: input.material_type,
    file_path: input.file_path.trim(),
    stage_id: input.stage_id || null,
    grade_id: input.grade_id || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
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

    const { count } = await supabase
      .from("educational_materials")
      .select("*", { count: "exact", head: true });

    const payload = {
      ...buildPayload(input),
      sort_order: count ?? 0,
    };

    const { data, error } = await supabase
      .from("educational_materials")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[materials] createMaterial:", error.message, {
        error,
        payload,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/materials");
    return {
      success: true,
      data: normalizeMaterial(data as Record<string, unknown>),
      message: "تمت إضافة المادة التعليمية بنجاح",
    };
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
      return { success: false, error: "مسار الملف مطلوب" };
    }
    if (!input.stage_id || !input.grade_id) {
      return { success: false, error: "يجب اختيار المرحلة والصف" };
    }

    const payload = buildPayload(input);
    const { data, error } = await supabase
      .from("educational_materials")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[materials] updateMaterial:", error.message, {
        error,
        id,
        payload,
      });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/materials");
    return {
      success: true,
      data: normalizeMaterial(data as Record<string, unknown>),
      message: "تم تحديث المادة التعليمية بنجاح",
    };
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
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/materials");
    return { success: true, message: "تم حذف المادة" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[materials] deleteMaterial exception:", err);
    return { success: false, error: message };
  }
}