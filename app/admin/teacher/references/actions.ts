"use server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { ActionResult, TeacherReference } from "@/lib/types";
const PATH = "/admin/teacher/references";
function normalize(row: Record<string, unknown>): TeacherReference {
  const description = String(row.description ?? "").trim();
  return { id: String(row.id), title: String(row.title ?? ""), description: description || null, file_url: String(row.file_url ?? "").trim(), stage_id: row.stage_id ? String(row.stage_id) : null, grade_id: row.grade_id ? String(row.grade_id) : null, is_active: row.is_active !== false, sort_order: Number(row.sort_order ?? 0), created_at: row.created_at ? String(row.created_at) : undefined, updated_at: row.updated_at ? String(row.updated_at) : undefined };
}
export type ReferenceInput = { title: string; description?: string | null; file_url: string; stage_id: string; grade_id: string; is_active: boolean };
function payload(input: ReferenceInput) {
  const description = String(input.description ?? "").trim();
  return { title: input.title.trim(), description: description || null, file_url: input.file_url.trim(), stage_id: input.stage_id || null, grade_id: input.grade_id || null, is_active: input.is_active !== false, updated_at: new Date().toISOString() };
}
async function persist(mode: "insert" | "update", input: ReferenceInput, id?: string): Promise<ActionResult<TeacherReference>> {
  const body = payload(input);
  const run = async (row: Record<string, unknown>) => {
    if (mode === "insert") {
      const counted = await supabase.from("teacher_references").select("*", { count: "exact", head: true });
      return supabase.from("teacher_references").insert({ ...row, sort_order: counted.count ?? 0 }).select("*").single();
    }
    return supabase.from("teacher_references").update(row).eq("id", id!).select("*").single();
  };
  let result = await run(body);
  if (result.error && /description/i.test(result.error.message) && /(column|schema cache|does not exist)/i.test(result.error.message)) {
    const { description: _omit, ...rest } = body;
    result = await run(rest);
  }
  if (result.error) return { success: false, error: result.error.message };
  revalidatePath(PATH); revalidatePath("/admin/teacher");
  return { success: true, data: normalize(result.data as Record<string, unknown>), message: mode === "insert" ? "تمت إضافة المرجع" : "تم تحديث المرجع" };
}
export async function getReferences(): Promise<ActionResult<TeacherReference[]>> {
  const { data, error } = await supabase.from("teacher_references").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []).map((row) => normalize(row as Record<string, unknown>)) };
}
export async function createReference(input: ReferenceInput) {
  if (!input.title.trim()) return { success: false as const, error: "العنوان مطلوب" };
  if (!input.file_url.trim()) return { success: false as const, error: "يجب رفع ملف PDF أولاً" };
  if (!input.stage_id || !input.grade_id) return { success: false as const, error: "يجب اختيار المرحلة والصف" };
  return persist("insert", input);
}
export async function updateReference(id: string, input: ReferenceInput) {
  if (!id) return { success: false as const, error: "معرّف المرجع غير صالح" };
  if (!input.file_url.trim()) return { success: false as const, error: "يجب رفع ملف PDF أولاً" };
  if (!input.stage_id || !input.grade_id) return { success: false as const, error: "يجب اختيار المرحلة والصف" };
  return persist("update", input, id);
}
export async function toggleReferenceActive(id: string, is_active: boolean) {
  const { data, error } = await supabase.from("teacher_references").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return { success: false as const, error: error.message };
  revalidatePath(PATH);
  return { success: true as const, data: normalize(data as Record<string, unknown>), message: is_active ? "تم تفعيل المرجع" : "تم إيقاف المرجع" };
}
export async function deleteReference(id: string) {
  const { error } = await supabase.from("teacher_references").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath(PATH);
  return { success: true as const, message: "تم حذف المرجع" };
}
