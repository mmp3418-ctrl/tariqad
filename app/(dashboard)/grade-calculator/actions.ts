"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import { insertFlexible, updateFlexible } from "@/lib/supabase-write";
import {
  normalizeRelatedTitle,
  normalizeResourceRow,
} from "@/lib/schema-compat";
import type {
  ActionResult,
  GradeCalculatorTool,
  GradeRecord,
} from "@/lib/types";

const TOOL_SELECTS = [
  "*, grades(id, title), units(id, title)",
  "*, grades(id, title_ar), units(id, title_ar)",
  "*",
];

const RECORD_SELECTS = [
  "*, grades(id, title), units(id, title)",
  "*, grades(id, title_ar), units(id, title_ar)",
  "*",
];

function revalidate() {
  revalidatePath("/grade-calculator");
  revalidatePath("/teacher-space");
}

function normalizeTool(row: Record<string, unknown>): GradeCalculatorTool {
  const base = normalizeResourceRow(row);
  const grades = normalizeRelatedTitle(row.grades);
  const units = normalizeRelatedTitle(row.units);
  return {
    id: String(base.id),
    title_ar: base.title_ar,
    description_ar: base.description_ar,
    url: base.url,
    grade_id: (base.grade_id as string | null) ?? null,
    unit_id: (base.unit_id as string | null) ?? null,
    max_score: Number(base.max_score ?? 100),
    is_active: base.is_active !== false,
    is_coming_soon: Boolean(base.is_coming_soon),
    created_at: String(base.created_at ?? new Date().toISOString()),
    grades: grades ? { id: grades.id, title_ar: grades.title_ar } : null,
    units: units ? { id: units.id, title_ar: units.title_ar } : null,
  };
}

function normalizeRecord(row: Record<string, unknown>): GradeRecord {
  const grades = normalizeRelatedTitle(row.grades);
  const units = normalizeRelatedTitle(row.units);
  return {
    id: String(row.id),
    student_name: String(row.student_name ?? ""),
    grade_id: String(row.grade_id ?? ""),
    unit_id: String(row.unit_id ?? ""),
    score: Number(row.score ?? 0),
    max_score: Number(row.max_score ?? 100),
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    grades: grades ? { id: grades.id, title_ar: grades.title_ar } : null,
    units: units ? { id: units.id, title_ar: units.title_ar } : null,
  };
}

const GRADE_TOOL_PRESET = {
  title: "أداة جمع الدرجات",
  description: "أداة جاهزة لجمع درجات الطلاب",
  file_url: "#",
  max_score: 100,
};

export async function ensureGradeCalculatorPresets(): Promise<
  ActionResult<GradeCalculatorTool[]>
> {
  try {
    const authError = await requireAuth<GradeCalculatorTool[]>();
    if (authError) return authError;

    const { data: existing, error: listError } = await supabase
      .from("grade_calculator_tools")
      .select("id")
      .limit(1);

    if (listError) return { success: false, error: listError.message };

    if (!existing?.length) {
      const { error: insertError } = await insertFlexible(
        "grade_calculator_tools",
        {
          title: GRADE_TOOL_PRESET.title,
          description: GRADE_TOOL_PRESET.description,
          file_url: GRADE_TOOL_PRESET.file_url,
          grade_id: null,
          unit_id: null,
          max_score: GRADE_TOOL_PRESET.max_score,
          is_active: true,
          is_coming_soon: false,
        }
      );
      if (insertError) return { success: false, error: insertError };
    }

    return getGradeCalculatorTools();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grade-calculator] ensurePresets:", err);
    return { success: false, error: message };
  }
}

export async function getGradeCalculatorTools(): Promise<
  ActionResult<GradeCalculatorTool[]>
> {
  try {
    const authError = await requireAuth<GradeCalculatorTool[]>();
    if (authError) return authError;

    let lastError: string | null = null;
    for (const select of TOOL_SELECTS) {
      const { data, error } = await supabase
        .from("grade_calculator_tools")
        .select(select)
        .order("created_at", { ascending: false });
      if (!error) {
        return {
          success: true,
          data: ((data as unknown as Record<string, unknown>[]) ?? []).map(
            normalizeTool
          ),
        };
      }
      lastError = error.message;
    }
    return { success: false, error: lastError ?? "فشل الجلب" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grade-calculator] getTools:", err);
    return { success: false, error: message };
  }
}

export async function updateGradeCalculatorTool(
  id: string,
  input: {
    title_ar: string;
    description_ar: string;
    url: string;
    max_score: number;
  }
): Promise<ActionResult<GradeCalculatorTool>> {
  try {
    const authError = await requireAuth<GradeCalculatorTool>();
    if (authError) return authError;

    if (!input.title_ar.trim() || !input.url.trim()) {
      return { success: false, error: "العنوان والرابط مطلوبان" };
    }

    const { data, error } = await updateFlexible<Record<string, unknown>>(
      "grade_calculator_tools",
      id,
      {
        title: input.title_ar.trim(),
        description: input.description_ar.trim() || null,
        file_url: input.url.trim(),
        max_score: Number(input.max_score) || 100,
      }
    );

    if (error || !data) return { success: false, error: error ?? "فشل التحديث" };
    revalidate();
    return {
      success: true,
      data: normalizeTool(data),
      message: "تم التحديث",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grade-calculator] updateTool:", err);
    return { success: false, error: message };
  }
}

export async function toggleGradeCalculatorActive(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("grade_calculator_tools")
    .update({ is_active })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    message: is_active ? "تم التفعيل" : "تم الإيقاف",
  };
}

export async function toggleGradeCalculatorComingSoon(
  id: string,
  is_coming_soon: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("grade_calculator_tools")
    .update({ is_coming_soon })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    message: is_coming_soon ? "تم تعليم الأداة كـ قريباً" : "تم إلغاء قريباً",
  };
}

export async function getGradeRecords(filters?: {
  grade_id?: string;
  unit_id?: string;
}): Promise<ActionResult<GradeRecord[]>> {
  try {
    const authError = await requireAuth<GradeRecord[]>();
    if (authError) return authError;

    let lastError: string | null = null;
    for (const select of RECORD_SELECTS) {
      let query = supabase
        .from("grade_records")
        .select(select)
        .order("created_at", { ascending: false });
      if (filters?.grade_id) query = query.eq("grade_id", filters.grade_id);
      if (filters?.unit_id) query = query.eq("unit_id", filters.unit_id);

      const { data, error } = await query;
      if (!error) {
        return {
          success: true,
          data: ((data as unknown as Record<string, unknown>[]) ?? []).map(
            normalizeRecord
          ),
        };
      }
      lastError = error.message;
    }
    return { success: false, error: lastError ?? "فشل الجلب" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grade-calculator] getRecords:", err);
    return { success: false, error: message };
  }
}

export async function createGradeRecord(input: {
  student_name: string;
  grade_id: string;
  unit_id: string;
  score: number;
  max_score: number;
  notes: string;
}): Promise<ActionResult<GradeRecord>> {
  try {
    const authError = await requireAuth<GradeRecord>();
    if (authError) return authError;

    if (!input.grade_id || !input.unit_id) {
      return { success: false, error: "الصف والوحدة مطلوبان" };
    }
    if (!input.student_name.trim()) {
      return { success: false, error: "اسم الطالب مطلوب" };
    }

    const { data, error } = await insertFlexible<Record<string, unknown>>(
      "grade_records",
      {
        student_name: input.student_name.trim(),
        grade_id: input.grade_id,
        unit_id: input.unit_id,
        score: Number(input.score) || 0,
        max_score: Number(input.max_score) || 100,
        notes: input.notes.trim() || null,
      }
    );

    if (error || !data) return { success: false, error: error ?? "فشل الحفظ" };
    revalidate();
    return {
      success: true,
      data: normalizeRecord(data),
      message: "تم تسجيل الدرجة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grade-calculator] createRecord:", err);
    return { success: false, error: message };
  }
}

export async function updateGradeRecord(
  id: string,
  input: {
    student_name: string;
    grade_id: string;
    unit_id: string;
    score: number;
    max_score: number;
    notes: string;
  }
): Promise<ActionResult<GradeRecord>> {
  try {
    const authError = await requireAuth<GradeRecord>();
    if (authError) return authError;

    const { data, error } = await updateFlexible<Record<string, unknown>>(
      "grade_records",
      id,
      {
        student_name: input.student_name.trim(),
        grade_id: input.grade_id,
        unit_id: input.unit_id,
        score: Number(input.score) || 0,
        max_score: Number(input.max_score) || 100,
        notes: input.notes.trim() || null,
      }
    );

    if (error || !data) return { success: false, error: error ?? "فشل التحديث" };
    revalidate();
    return {
      success: true,
      data: normalizeRecord(data),
      message: "تم تحديث الدرجة",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[grade-calculator] updateRecord:", err);
    return { success: false, error: message };
  }
}

export async function deleteGradeRecord(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("grade_records").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, message: "تم الحذف" };
}
