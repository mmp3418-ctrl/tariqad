"use server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { ActionResult, QuestionBankItem } from "@/lib/types";
const LETTERS = ["a", "b", "c", "d"] as const;
function asOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? ""));
  if (typeof value === "string") { try { const parsed = JSON.parse(value) as unknown; if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? "")); } catch { return []; } }
  return [];
}
function normalize(row: Record<string, unknown>): QuestionBankItem {
  let options = asOptions(row.options).map((item) => item.trim());
  const blank = options.length === 0 || options.every((item) => !item);
  let correct_index = Number(row.correct_index ?? 0);
  if (blank && (row.option_a != null || row.option_b != null)) {
    const raw = ["option_a", "option_b", "option_c", "option_d"].map((key) => String(row[key] ?? "").trim());
    while (raw.length && (raw[raw.length - 1] === "" || raw[raw.length - 1] === "—")) raw.pop();
    options = raw;
    const index = LETTERS.indexOf(String(row.correct_answer ?? "a").toLowerCase() as (typeof LETTERS)[number]);
    correct_index = index >= 0 ? index : 0;
  }
  if (!Number.isFinite(correct_index) || correct_index < 0) correct_index = 0;
  if (options.length && correct_index >= options.length) correct_index = options.length - 1;
  return { id: String(row.id), question_text: String(row.question_text ?? ""), options, correct_index, stage_id: row.stage_id ? String(row.stage_id) : null, grade_id: row.grade_id ? String(row.grade_id) : null, is_active: row.is_active !== false, sort_order: Number(row.sort_order ?? 0), created_at: row.created_at ? String(row.created_at) : undefined, updated_at: row.updated_at ? String(row.updated_at) : undefined };
}
export type QuestionInput = { question_text: string; options: string[]; correct_index: number; stage_id: string; grade_id: string; is_active: boolean };
function compact(options: string[]) {
  const trimmed = options.map((item) => item.trim());
  while (trimmed.length && !trimmed[trimmed.length - 1]) trimmed.pop();
  if (trimmed.length < 2) return { error: "أدخل خيارين على الأقل" };
  if (trimmed.some((item) => !item)) return { error: "املأ الخيارات بالترتيب دون ترك فراغ في الوسط" };
  return { options: trimmed };
}
async function persist(mode: "insert" | "update", input: QuestionInput, id?: string): Promise<ActionResult<QuestionBankItem>> {
  const packed = compact(input.options);
  if ("error" in packed) return { success: false, error: String(packed.error) };
  const padded = [...packed.options];
  while (padded.length < 4) padded.push("—");
  const full = { question_text: input.question_text.trim(), stage_id: input.stage_id || null, grade_id: input.grade_id || null, is_active: input.is_active !== false, updated_at: new Date().toISOString(), options: packed.options, correct_index: input.correct_index, option_a: padded[0], option_b: padded[1], option_c: padded[2], option_d: padded[3], correct_answer: LETTERS[Math.min(Math.max(input.correct_index, 0), 3)] };
  const run = async (body: Record<string, unknown>) => mode === "insert"
    ? supabase.from("question_bank").insert({ ...body, sort_order: (await supabase.from("question_bank").select("*", { count: "exact", head: true })).count ?? 0 }).select("*").single()
    : supabase.from("question_bank").update(body).eq("id", id!).select("*").single();
  const missing = (message: string, column: RegExp) => column.test(message) && /(column|schema cache|does not exist)/i.test(message);
  let result = await run(full);
  if (result.error && missing(result.error.message, /options|correct_index/i)) {
    const { options: _o, correct_index: _c, ...legacy } = full;
    result = await run(legacy);
  } else if (result.error && missing(result.error.message, /option_|correct_answer/i)) {
    const { option_a: _a, option_b: _b, option_c: _c, option_d: _d, correct_answer: _k, ...canonical } = full;
    result = await run(canonical);
  }
  if (result.error) return { success: false, error: result.error.message };
  revalidatePath("/admin/teacher/questions"); revalidatePath("/admin/teacher"); revalidatePath("/admin/teacher-space");
  return { success: true, data: normalize(result.data as Record<string, unknown>), message: mode === "insert" ? "تمت إضافة السؤال" : "تم تحديث السؤال" };
}
export async function getQuestions(): Promise<ActionResult<QuestionBankItem[]>> {
  const { data, error } = await supabase.from("question_bank").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []).map((row) => normalize(row as Record<string, unknown>)) };
}
export async function createQuestion(input: QuestionInput) {
  if (!input.question_text.trim()) return { success: false as const, error: "نص السؤال مطلوب" };
  if (!input.stage_id || !input.grade_id) return { success: false as const, error: "يجب اختيار المرحلة والصف" };
  return persist("insert", input);
}
export async function updateQuestion(id: string, input: QuestionInput) {
  if (!id) return { success: false as const, error: "معرّف السؤال غير صالح" };
  if (!input.stage_id || !input.grade_id) return { success: false as const, error: "يجب اختيار المرحلة والصف" };
  return persist("update", input, id);
}
export async function toggleQuestionActive(id: string, is_active: boolean) {
  const { data, error } = await supabase.from("question_bank").update({ is_active, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/admin/teacher/questions");
  return { success: true as const, data: normalize(data as Record<string, unknown>), message: is_active ? "تم تفعيل السؤال" : "تم إيقاف السؤال" };
}
export async function deleteQuestion(id: string) {
  const { error } = await supabase.from("question_bank").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/admin/teacher/questions");
  return { success: true as const, message: "تم حذف السؤال" };
}
