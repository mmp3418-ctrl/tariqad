"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type {
  ActionResult,
  TeacherTimetable,
  TimetableGridData,
} from "@/lib/types";

const PATH = "/admin/teacher/timetables";

function asGrid(value: unknown): TimetableGridData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: TimetableGridData = {};
  for (const [day, periods] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(periods)) continue;
    out[day] = periods.map((cell) => String(cell ?? ""));
  }
  return Object.keys(out).length ? out : null;
}

function normalize(row: Record<string, unknown>): TeacherTimetable {
  const file = String(row.file_url ?? "").trim();
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    file_url: file || null,
    grid_data: asGrid(row.grid_data),
    period_count: Math.max(3, Math.min(10, Number(row.period_count ?? 6) || 6)),
    stage_id: row.stage_id ? String(row.stage_id) : null,
    grade_id: row.grade_id ? String(row.grade_id) : null,
    is_active: row.is_active !== false,
    sort_order: Number(row.sort_order ?? 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export type TimetableInput = {
  title: string;
  file_url: string;
  stage_id: string;
  grade_id: string;
  is_active: boolean;
  grid_data?: TimetableGridData | null;
  period_count?: number;
};

function payload(input: TimetableInput) {
  const file_url = input.file_url.trim();
  const period_count = Math.max(
    3,
    Math.min(10, Number(input.period_count ?? 6) || 6)
  );
  return {
    title: input.title.trim(),
    file_url: file_url || null,
    stage_id: input.stage_id || null,
    grade_id: input.grade_id || null,
    is_active: input.is_active !== false,
    grid_data: input.grid_data ?? null,
    period_count,
    updated_at: new Date().toISOString(),
  };
}

function invalid(input: TimetableInput) {
  if (!input.title.trim()) return "العنوان مطلوب";
  if (!input.file_url.trim() && !input.grid_data) {
    return "صدّر PDF أو أدخل شبكة الحصص قبل الحفظ";
  }
  if (!input.stage_id || !input.grade_id) return "يجب اختيار المرحلة والصف";
  return null;
}

async function persist(
  mode: "insert" | "update",
  input: TimetableInput,
  id?: string
): Promise<ActionResult<TeacherTimetable>> {
  const body = payload(input);
  const counted = await supabase
    .from("teacher_timetables")
    .select("*", { count: "exact", head: true });

  const run = async (data: Record<string, unknown>) =>
    mode === "insert"
      ? supabase
          .from("teacher_timetables")
          .insert({ ...data, sort_order: counted.count ?? 0 })
          .select("*")
          .single()
      : supabase
          .from("teacher_timetables")
          .update(data)
          .eq("id", id!)
          .select("*")
          .single();

  let { data, error } = await run(body);

  // Legacy tables without grid_data / period_count
  if (
    error &&
    /(grid_data|period_count)/i.test(error.message) &&
    /(column|schema cache|does not exist)/i.test(error.message)
  ) {
    const { grid_data: _g, period_count: _p, ...legacy } = body;
    const retry = await run(legacy);
    data = retry.data;
    error = retry.error;
  }

  if (error) return { success: false, error: error.message };
  revalidatePath(PATH);
  revalidatePath("/admin/teacher");
  revalidatePath("/admin/teacher-space");
  return {
    success: true,
    data: normalize(data as Record<string, unknown>),
    message: mode === "insert" ? "تمت إضافة الجدول" : "تم تحديث الجدول",
  };
}

export async function getTimetables(): Promise<ActionResult<TeacherTimetable[]>> {
  try {
    const { data, error } = await supabase
      .from("teacher_timetables")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((row) =>
        normalize(row as Record<string, unknown>)
      ),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function createTimetable(
  input: TimetableInput
): Promise<ActionResult<TeacherTimetable>> {
  try {
    const message = invalid(input);
    if (message) return { success: false, error: message };
    return await persist("insert", input);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function updateTimetable(
  id: string,
  input: TimetableInput
): Promise<ActionResult<TeacherTimetable>> {
  try {
    if (!id) return { success: false, error: "معرّف الجدول غير صالح" };
    const message = invalid(input);
    if (message) return { success: false, error: message };
    return await persist("update", input, id);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function toggleTimetableActive(
  id: string,
  is_active: boolean
): Promise<ActionResult<TeacherTimetable>> {
  try {
    const { data, error } = await supabase
      .from("teacher_timetables")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    revalidatePath(PATH);
    revalidatePath("/admin/teacher");
    return {
      success: true,
      data: normalize(data as Record<string, unknown>),
      message: is_active ? "تم تفعيل الجدول" : "تم إيقاف الجدول",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function deleteTimetable(id: string): Promise<ActionResult> {
  try {
    const { error } = await supabase
      .from("teacher_timetables")
      .delete()
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath(PATH);
    revalidatePath("/admin/teacher");
    return { success: true, message: "تم حذف الجدول" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
