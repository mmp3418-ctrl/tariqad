"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type {
  ActionResult,
  GradeCalculatorTool,
  GradeRecord,
} from "@/lib/types";

const TOOL_SELECT =
  "id, title_ar, description_ar, url, grade_id, unit_id, max_score, is_coming_soon, created_at, grades(id, title_ar), units(id, title_ar)";

const RECORD_SELECT =
  "id, student_name, grade_id, unit_id, score, max_score, notes, created_at, grades(id, title_ar), units(id, title_ar)";

function revalidate() {
  revalidatePath("/grade-calculator");
}

/* ── Tools ── */

export async function getGradeCalculatorTools(filters?: {
  grade_id?: string;
  unit_id?: string;
}): Promise<ActionResult<GradeCalculatorTool[]>> {
  const authError = await requireAuth<GradeCalculatorTool[]>();
  if (authError) return authError;

  let query = supabase
    .from("grade_calculator_tools")
    .select(TOOL_SELECT)
    .order("created_at", { ascending: false });

  if (filters?.grade_id) query = query.eq("grade_id", filters.grade_id);
  if (filters?.unit_id) query = query.eq("unit_id", filters.unit_id);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data as unknown as GradeCalculatorTool[]) ?? [],
  };
}

export async function createGradeCalculatorTool(input: {
  title_ar: string;
  description_ar: string;
  url: string;
  grade_id: string;
  unit_id: string;
  max_score: number;
  is_coming_soon: boolean;
}): Promise<ActionResult<GradeCalculatorTool>> {
  const authError = await requireAuth<GradeCalculatorTool>();
  if (authError) return authError;

  if (!input.grade_id || !input.unit_id) {
    return { success: false, error: "الصف والوحدة مطلوبان" };
  }
  if (!input.title_ar.trim() || !input.url.trim()) {
    return { success: false, error: "العنوان والرابط مطلوبان" };
  }

  const { data, error } = await supabase
    .from("grade_calculator_tools")
    .insert({
      title_ar: input.title_ar.trim(),
      description_ar: input.description_ar.trim() || null,
      url: input.url.trim(),
      grade_id: input.grade_id,
      unit_id: input.unit_id,
      max_score: Number(input.max_score) || 100,
      is_coming_soon: input.is_coming_soon ?? false,
    })
    .select(TOOL_SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    data: data as unknown as GradeCalculatorTool,
    message: "تم إضافة الأداة",
  };
}

export async function updateGradeCalculatorTool(
  id: string,
  input: {
    title_ar: string;
    description_ar: string;
    url: string;
    grade_id: string;
    unit_id: string;
    max_score: number;
    is_coming_soon: boolean;
  }
): Promise<ActionResult<GradeCalculatorTool>> {
  const authError = await requireAuth<GradeCalculatorTool>();
  if (authError) return authError;

  if (!input.grade_id || !input.unit_id) {
    return { success: false, error: "الصف والوحدة مطلوبان" };
  }

  const { data, error } = await supabase
    .from("grade_calculator_tools")
    .update({
      title_ar: input.title_ar.trim(),
      description_ar: input.description_ar.trim() || null,
      url: input.url.trim(),
      grade_id: input.grade_id,
      unit_id: input.unit_id,
      max_score: Number(input.max_score) || 100,
      is_coming_soon: input.is_coming_soon ?? false,
    })
    .eq("id", id)
    .select(TOOL_SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    data: data as unknown as GradeCalculatorTool,
    message: "تم التحديث",
  };
}

export async function deleteGradeCalculatorTool(
  id: string
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("grade_calculator_tools")
    .delete()
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, message: "تم الحذف" };
}

/* ── Records ── */

export async function getGradeRecords(filters?: {
  grade_id?: string;
  unit_id?: string;
}): Promise<ActionResult<GradeRecord[]>> {
  const authError = await requireAuth<GradeRecord[]>();
  if (authError) return authError;

  let query = supabase
    .from("grade_records")
    .select(RECORD_SELECT)
    .order("created_at", { ascending: false });

  if (filters?.grade_id) query = query.eq("grade_id", filters.grade_id);
  if (filters?.unit_id) query = query.eq("unit_id", filters.unit_id);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    data: (data as unknown as GradeRecord[]) ?? [],
  };
}

export async function createGradeRecord(input: {
  student_name: string;
  grade_id: string;
  unit_id: string;
  score: number;
  max_score: number;
  notes: string;
}): Promise<ActionResult<GradeRecord>> {
  const authError = await requireAuth<GradeRecord>();
  if (authError) return authError;

  if (!input.grade_id || !input.unit_id) {
    return { success: false, error: "الصف والوحدة مطلوبان" };
  }
  if (!input.student_name.trim()) {
    return { success: false, error: "اسم الطالب مطلوب" };
  }

  const { data, error } = await supabase
    .from("grade_records")
    .insert({
      student_name: input.student_name.trim(),
      grade_id: input.grade_id,
      unit_id: input.unit_id,
      score: Number(input.score) || 0,
      max_score: Number(input.max_score) || 100,
      notes: input.notes.trim() || null,
    })
    .select(RECORD_SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    data: data as unknown as GradeRecord,
    message: "تم تسجيل الدرجة",
  };
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
  const authError = await requireAuth<GradeRecord>();
  if (authError) return authError;

  if (!input.grade_id || !input.unit_id) {
    return { success: false, error: "الصف والوحدة مطلوبان" };
  }

  const { data, error } = await supabase
    .from("grade_records")
    .update({
      student_name: input.student_name.trim(),
      grade_id: input.grade_id,
      unit_id: input.unit_id,
      score: Number(input.score) || 0,
      max_score: Number(input.max_score) || 100,
      notes: input.notes.trim() || null,
    })
    .eq("id", id)
    .select(RECORD_SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    data: data as unknown as GradeRecord,
    message: "تم تحديث الدرجة",
  };
}

export async function deleteGradeRecord(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("grade_records").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, message: "تم الحذف" };
}
