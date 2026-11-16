"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult, TeacherSchedule } from "@/lib/types";

export async function getSchedules(
  teacherName?: string
): Promise<ActionResult<TeacherSchedule[]>> {
  const authError = await requireAuth<TeacherSchedule[]>();
  if (authError) return authError;

  let query = supabase
    .from("teacher_schedules")
    .select("*")
    .order("teacher_name", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("period_number", { ascending: true });

  if (teacherName) query = query.eq("teacher_name", teacherName);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as TeacherSchedule[]) ?? [] };
}

export async function getTeacherNames(): Promise<ActionResult<string[]>> {
  const authError = await requireAuth<string[]>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("teacher_schedules")
    .select("teacher_name")
    .order("teacher_name", { ascending: true });

  if (error) return { success: false, error: error.message };
  const rows = (data as Pick<TeacherSchedule, "teacher_name">[]) ?? [];
  return {
    success: true,
    data: Array.from(new Set(rows.map((r) => r.teacher_name))),
  };
}

export async function createSchedule(input: {
  teacher_name: string;
  day_of_week: number;
  period_number: number;
  class_name: string;
  subject: string;
  is_active?: boolean;
}): Promise<ActionResult<TeacherSchedule>> {
  const authError = await requireAuth<TeacherSchedule>();
  if (authError) return authError;

  if (
    !input.teacher_name.trim() ||
    !input.class_name.trim() ||
    !input.subject.trim()
  ) {
    return { success: false, error: "جميع الحقول مطلوبة" };
  }

  const { data, error } = await supabase
    .from("teacher_schedules")
    .insert({
      teacher_name: input.teacher_name.trim(),
      day_of_week: Number(input.day_of_week),
      period_number: Number(input.period_number),
      class_name: input.class_name.trim(),
      subject: input.subject.trim(),
      is_active: input.is_active ?? true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/schedules");
  return {
    success: true,
    data: data as TeacherSchedule,
    message: "تم إضافة الحصة بنجاح",
  };
}

export async function updateSchedule(
  id: string,
  input: {
    teacher_name: string;
    day_of_week: number;
    period_number: number;
    class_name: string;
    subject: string;
    is_active?: boolean;
  }
): Promise<ActionResult<TeacherSchedule>> {
  const authError = await requireAuth<TeacherSchedule>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("teacher_schedules")
    .update({
      teacher_name: input.teacher_name.trim(),
      day_of_week: Number(input.day_of_week),
      period_number: Number(input.period_number),
      class_name: input.class_name.trim(),
      subject: input.subject.trim(),
      is_active: input.is_active ?? true,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/schedules");
  return {
    success: true,
    data: data as TeacherSchedule,
    message: "تم تحديث الحصة بنجاح",
  };
}

export async function toggleScheduleActive(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("teacher_schedules")
    .update({ is_active })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/schedules");
  return {
    success: true,
    message: is_active ? "تم تفعيل الجدول" : "تم إيقاف الجدول",
  };
}

export async function deleteSchedule(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("teacher_schedules")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/schedules");
  return { success: true, message: "تم حذف الحصة" };
}
