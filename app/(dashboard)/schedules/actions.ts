"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult, ClassSchedule } from "@/lib/types";

const SELECT =
  "id, class_name, day_of_week, period_number, subject, room, is_active";

function revalidate() {
  revalidatePath("/schedules");
  revalidatePath("/teacher-space");
}

export async function getClassSchedules(
  className?: string
): Promise<ActionResult<ClassSchedule[]>> {
  const authError = await requireAuth<ClassSchedule[]>();
  if (authError) return authError;

  let query = supabase
    .from("class_schedules")
    .select(SELECT)
    .order("class_name", { ascending: true })
    .order("day_of_week", { ascending: true })
    .order("period_number", { ascending: true });

  if (className) query = query.eq("class_name", className);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as ClassSchedule[]) ?? [] };
}

export async function getClassNames(): Promise<ActionResult<string[]>> {
  const authError = await requireAuth<string[]>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("class_schedules")
    .select("class_name")
    .order("class_name", { ascending: true });

  if (error) return { success: false, error: error.message };
  const rows = (data as Pick<ClassSchedule, "class_name">[]) ?? [];
  return {
    success: true,
    data: Array.from(new Set(rows.map((r) => r.class_name))),
  };
}

export async function createClassSchedule(input: {
  class_name: string;
  day_of_week: number;
  period_number: number;
  subject: string;
  room?: string;
}): Promise<ActionResult<ClassSchedule>> {
  const authError = await requireAuth<ClassSchedule>();
  if (authError) return authError;

  if (!input.class_name.trim() || !input.subject.trim()) {
    return { success: false, error: "اسم الفصل والمادة مطلوبان" };
  }

  const { data, error } = await supabase
    .from("class_schedules")
    .insert({
      class_name: input.class_name.trim(),
      day_of_week: Number(input.day_of_week),
      period_number: Number(input.period_number),
      subject: input.subject.trim(),
      room: input.room?.trim() || null,
      is_active: true,
    })
    .select(SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    data: data as ClassSchedule,
    message: "تم إضافة الحصة",
  };
}

export async function updateClassSchedule(
  id: string,
  input: {
    class_name: string;
    day_of_week: number;
    period_number: number;
    subject: string;
    room?: string;
  }
): Promise<ActionResult<ClassSchedule>> {
  const authError = await requireAuth<ClassSchedule>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("class_schedules")
    .update({
      class_name: input.class_name.trim(),
      day_of_week: Number(input.day_of_week),
      period_number: Number(input.period_number),
      subject: input.subject.trim(),
      room: input.room?.trim() || null,
      is_active: true,
    })
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  revalidate();
  return {
    success: true,
    data: data as ClassSchedule,
    message: "تم تحديث الحصة",
  };
}

export async function deleteClassSchedule(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("class_schedules").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidate();
  return { success: true, message: "تم حذف الحصة" };
}

export async function toggleClassScheduleActive(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase
    .from("class_schedules")
    .update({ is_active })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/teacher-space");
  revalidate();
  return {
    success: true,
    message: is_active ? "تم تفعيل الحصة" : "تم إيقاف الحصة",
  };
}
