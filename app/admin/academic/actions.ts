"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type {
  AcademicGrade,
  AcademicStage,
  AcademicTree,
  AcademicUnit,
  ActionResult,
} from "@/lib/types";

function normalizeStage(row: Record<string, unknown>): AcademicStage {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_active: row.is_active !== false,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function normalizeGrade(row: Record<string, unknown>): AcademicGrade {
  return {
    id: String(row.id),
    stage_id: String(row.stage_id ?? ""),
    name: String(row.name ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_active: row.is_active !== false,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function normalizeUnit(row: Record<string, unknown>): AcademicUnit {
  return {
    id: String(row.id),
    grade_id: String(row.grade_id ?? ""),
    name: String(row.name ?? ""),
    sort_order: Number(row.sort_order ?? 0),
    is_active: row.is_active !== false,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getAcademicTree(): Promise<ActionResult<AcademicTree>> {
  try {
    const [stagesRes, gradesRes, unitsRes] = await Promise.all([
      supabase
        .from("academic_stages")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("academic_grades")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("academic_units")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    if (stagesRes.error) {
      console.error("[academic] stages:", stagesRes.error.message, stagesRes.error);
      return { success: false, error: stagesRes.error.message };
    }
    if (gradesRes.error) {
      console.error("[academic] grades:", gradesRes.error.message, gradesRes.error);
      return { success: false, error: gradesRes.error.message };
    }
    if (unitsRes.error) {
      console.error("[academic] units:", unitsRes.error.message, unitsRes.error);
      return { success: false, error: unitsRes.error.message };
    }

    return {
      success: true,
      data: {
        stages: (stagesRes.data ?? []).map((r) =>
          normalizeStage(r as Record<string, unknown>)
        ),
        grades: (gradesRes.data ?? []).map((r) =>
          normalizeGrade(r as Record<string, unknown>)
        ),
        units: (unitsRes.data ?? []).map((r) =>
          normalizeUnit(r as Record<string, unknown>)
        ),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] getAcademicTree exception:", err);
    return { success: false, error: message };
  }
}

async function nextSort(table: string): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function createStage(
  name: string
): Promise<ActionResult<AcademicStage>> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "اسم المرحلة مطلوب" };

    const payload = {
      name: trimmed,
      sort_order: await nextSort("academic_stages"),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("academic_stages")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[academic] createStage:", error.message, { error, payload });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/academic");
    revalidatePath("/admin/materials");
    revalidatePath("/admin/playlists");
    return {
      success: true,
      data: normalizeStage(data as Record<string, unknown>),
      message: "تمت إضافة المرحلة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] createStage exception:", err);
    return { success: false, error: message };
  }
}

export async function updateStage(
  id: string,
  name: string
): Promise<ActionResult<AcademicStage>> {
  try {
    if (!id) return { success: false, error: "معرّف المرحلة غير صالح" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "اسم المرحلة مطلوب" };

    const { data, error } = await supabase
      .from("academic_stages")
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[academic] updateStage:", error.message, { error, id });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/academic");
    return {
      success: true,
      data: normalizeStage(data as Record<string, unknown>),
      message: "تم تحديث المرحلة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] updateStage exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleStageActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<AcademicStage>> {
  try {
    if (!id) return { success: false, error: "معرّف المرحلة غير صالح" };
    const { data, error } = await supabase
      .from("academic_stages")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[academic] toggleStageActive:", error.message, error);
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/academic");
    return {
      success: true,
      data: normalizeStage(data as Record<string, unknown>),
      message: is_active ? "تم تفعيل المرحلة" : "تم إيقاف المرحلة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] toggleStageActive exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteStage(id: string): Promise<ActionResult> {
  try {
    if (!id) return { success: false, error: "معرّف المرحلة غير صالح" };
    const { error } = await supabase.from("academic_stages").delete().eq("id", id);
    if (error) {
      console.error("[academic] deleteStage:", error.message, { error, id });
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/academic");
    revalidatePath("/admin/materials");
    revalidatePath("/admin/playlists");
    return { success: true, message: "تم حذف المرحلة" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] deleteStage exception:", err);
    return { success: false, error: message };
  }
}

export async function createGrade(
  stage_id: string,
  name: string
): Promise<ActionResult<AcademicGrade>> {
  try {
    if (!stage_id) return { success: false, error: "اختر المرحلة أولاً" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "اسم الصف مطلوب" };

    const payload = {
      stage_id,
      name: trimmed,
      sort_order: await nextSort("academic_grades"),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("academic_grades")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[academic] createGrade:", error.message, { error, payload });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/academic");
    revalidatePath("/admin/materials");
    revalidatePath("/admin/playlists");
    return {
      success: true,
      data: normalizeGrade(data as Record<string, unknown>),
      message: "تمت إضافة الصف",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] createGrade exception:", err);
    return { success: false, error: message };
  }
}

export async function updateGrade(
  id: string,
  stage_id: string,
  name: string
): Promise<ActionResult<AcademicGrade>> {
  try {
    if (!id) return { success: false, error: "معرّف الصف غير صالح" };
    if (!stage_id) return { success: false, error: "اختر المرحلة" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "اسم الصف مطلوب" };

    const { data, error } = await supabase
      .from("academic_grades")
      .update({
        stage_id,
        name: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[academic] updateGrade:", error.message, { error, id });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/academic");
    return {
      success: true,
      data: normalizeGrade(data as Record<string, unknown>),
      message: "تم تحديث الصف",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] updateGrade exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleGradeActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<AcademicGrade>> {
  try {
    if (!id) return { success: false, error: "معرّف الصف غير صالح" };
    const { data, error } = await supabase
      .from("academic_grades")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[academic] toggleGradeActive:", error.message, error);
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/academic");
    return {
      success: true,
      data: normalizeGrade(data as Record<string, unknown>),
      message: is_active ? "تم تفعيل الصف" : "تم إيقاف الصف",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] toggleGradeActive exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteGrade(id: string): Promise<ActionResult> {
  try {
    if (!id) return { success: false, error: "معرّف الصف غير صالح" };
    const { error } = await supabase.from("academic_grades").delete().eq("id", id);
    if (error) {
      console.error("[academic] deleteGrade:", error.message, { error, id });
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/academic");
    revalidatePath("/admin/materials");
    revalidatePath("/admin/playlists");
    return { success: true, message: "تم حذف الصف" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] deleteGrade exception:", err);
    return { success: false, error: message };
  }
}

export async function createUnit(
  grade_id: string,
  name: string
): Promise<ActionResult<AcademicUnit>> {
  try {
    if (!grade_id) return { success: false, error: "اختر الصف أولاً" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "اسم الوحدة مطلوب" };

    const payload = {
      grade_id,
      name: trimmed,
      sort_order: await nextSort("academic_units"),
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("academic_units")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("[academic] createUnit:", error.message, { error, payload });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/academic");
    revalidatePath("/admin/materials");
    revalidatePath("/admin/playlists");
    return {
      success: true,
      data: normalizeUnit(data as Record<string, unknown>),
      message: "تمت إضافة الوحدة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] createUnit exception:", err);
    return { success: false, error: message };
  }
}

export async function updateUnit(
  id: string,
  grade_id: string,
  name: string
): Promise<ActionResult<AcademicUnit>> {
  try {
    if (!id) return { success: false, error: "معرّف الوحدة غير صالح" };
    if (!grade_id) return { success: false, error: "اختر الصف" };
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: "اسم الوحدة مطلوب" };

    const { data, error } = await supabase
      .from("academic_units")
      .update({
        grade_id,
        name: trimmed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[academic] updateUnit:", error.message, { error, id });
      return { success: false, error: error.message };
    }

    revalidatePath("/admin/academic");
    return {
      success: true,
      data: normalizeUnit(data as Record<string, unknown>),
      message: "تم تحديث الوحدة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] updateUnit exception:", err);
    return { success: false, error: message };
  }
}

export async function toggleUnitActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<AcademicUnit>> {
  try {
    if (!id) return { success: false, error: "معرّف الوحدة غير صالح" };
    const { data, error } = await supabase
      .from("academic_units")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[academic] toggleUnitActive:", error.message, error);
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/academic");
    return {
      success: true,
      data: normalizeUnit(data as Record<string, unknown>),
      message: is_active ? "تم تفعيل الوحدة" : "تم إيقاف الوحدة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] toggleUnitActive exception:", err);
    return { success: false, error: message };
  }
}

export async function deleteUnit(id: string): Promise<ActionResult> {
  try {
    if (!id) return { success: false, error: "معرّف الوحدة غير صالح" };
    const { error } = await supabase.from("academic_units").delete().eq("id", id);
    if (error) {
      console.error("[academic] deleteUnit:", error.message, { error, id });
      return { success: false, error: error.message };
    }
    revalidatePath("/admin/academic");
    revalidatePath("/admin/materials");
    revalidatePath("/admin/playlists");
    return { success: true, message: "تم حذف الوحدة" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[academic] deleteUnit exception:", err);
    return { success: false, error: message };
  }
}