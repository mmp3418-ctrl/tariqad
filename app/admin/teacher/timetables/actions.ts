"use server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { ActionResult, TeacherTimetable } from "@/lib/types";
const PATH = "/admin/teacher/timetables";
function normalize(row: Record<string, unknown>): TeacherTimetable {
  return { id: String(row.id), title: String(row.title ?? ""), file_url: String(row.file_url ?? "").trim(), stage_id: row.stage_id ? String(row.stage_id) : null, grade_id: row.grade_id ? String(row.grade_id) : null, is_active: row.is_active !== false, sort_order: Number(row.sort_order ?? 0), created_at: row.created_at ? String(row.created_at) : undefined, updated_at: row.updated_at ? String(row.updated_at) : undefined };
}
export type TimetableInput = { title: string; file_url: string; stage_id: string; grade_id: string; is_active: boolean };
function payload(input: TimetableInput) { return { title: input.title.trim(), file_url: input.file_url.trim(), stage_id: input.stage_id || null, grade_id: input.grade_id || null, is_active: input.is_active !== false, updated_at: new Date().toISOString() }; }
function invalid(input: TimetableInput) { if (!input.title.trim()) return "العنوان مطلوب"; if (!input.file_url.trim()) return "يجب رفع ملف PDF أولاً"; if (!input.stage_id || !input.grade_id) return "يجب اختيار المرحلة والصف"; return null; }
async function persist(mode: "insert" | "update", input: TimetableInput, id?: string): Promise<ActionResult<TeacherTimetable>> {
  const body = payload(input);
  const counted = await supabase.from("teacher_timetables").select("*", { count: "exact", head: true });
  const query = mode === "insert" ? supabase.from("teacher_timetables").insert({ ...body, sort_order: counted.count ?? 0 }).select("*").single() : supabase.from("teacher_timetables").update(body).eq("id", id!).select("*").single();
  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  revalidatePath(PATH); revalidatePath("/admin/teacher");
  return { success: true, data: normalize(data as Record<string, unknown>), message: mode === "insert" ? "تمت إضافة الجدول" : "تم تحديث الجدول" };
}
export async function getTimetables(): Promise<ActionResult<TeacherTimetable[]>> {
  const { data, error } = await supabase.from("teacher_timetables").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []).map((row) => normalize(row as Record<string, unknown>)) };
}
export async function createTimetable(input: TimetableInput) { const message = invalid(input); if (message) return { success: false as const, error: message }; return persist("insert", input); }
export async function updateTimetable(id: string, input: TimetableInput) { if (!id) return { success: false as const, error: "معرّف الجدول غير صالح" }; const message = invalid(input); if (message) return { success: false as const, error: message }; return persist("update", input, id); }
export async function toggleTimetableActive(id: string, is_active: boolean) {
  const { data, error } = await supabase.from("teacher_timetables").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return { success: false as const, error: error.message };
  revalidatePath(PATH);
  return { success: true as const, data: normalize(data as Record<string, unknown>), message: is_active ? "تم تفعيل الجدول" : "تم إيقاف الجدول" };
}
export async function deleteTimetable(id: string) {
  const { error } = await supabase.from("teacher_timetables").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath(PATH);
  return { success: true as const, message: "تم حذف الجدول" };
}
