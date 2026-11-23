"use server";

import { revalidatePath } from "next/cache";
import { arabicDbError, requireUuid, toUuidOrNull } from "@/lib/ids";
import { supabase } from "@/lib/supabase";
import type { ActionResult, Subject } from "@/lib/types";

function normalizeSubject(row: Record<string, unknown>): Subject {
  return {
    id: String(row.id),
    name_ar: String(row.name_ar ?? "").trim(),
    name_en: String(row.name_en ?? "").trim() || null,
    stage: String(row.stage ?? ""),
    grade: String(row.grade ?? ""),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getSubjects(): Promise<ActionResult<Subject[]>> {
  try {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("name_ar", { ascending: true });

    if (error) {
      console.error("[subjects] getSubjects:", error.message);
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

    const { data, error } = await supabase
      .from("subjects")
      .insert({
        name_ar,
        name_en,
        stage,
        grade,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("[subjects] createSubject:", error.message);
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

    const { data, error } = await supabase
      .from("subjects")
      .update({
        name_ar,
        name_en,
        stage,
        grade,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checked.id)
      .select("*")
      .single();

    if (error) {
      console.error("[subjects] updateSubject:", error.message);
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
      console.error("[subjects] deleteSubject:", error.message);
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
