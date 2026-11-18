"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { ActionResult, SiteTimetableStatus } from "@/lib/types";

function normalize(row: Record<string, unknown>): SiteTimetableStatus {
  return {
    id: 1,
    is_active: row.is_active !== false,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

async function ensureRow(): Promise<ActionResult<SiteTimetableStatus>> {
  const existing = await supabase
    .from("site_timetable_status")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (existing.data) {
    return {
      success: true,
      data: normalize(existing.data as Record<string, unknown>),
    };
  }

  const inserted = await supabase
    .from("site_timetable_status")
    .upsert({ id: 1, is_active: true, updated_at: new Date().toISOString() })
    .select("*")
    .single();

  if (inserted.error) {
    return { success: false, error: inserted.error.message };
  }

  return {
    success: true,
    data: normalize(inserted.data as Record<string, unknown>),
  };
}

export async function getSiteTimetableStatus(): Promise<
  ActionResult<SiteTimetableStatus>
> {
  try {
    return await ensureRow();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function setSiteTimetableActive(
  is_active: boolean
): Promise<ActionResult<SiteTimetableStatus>> {
  try {
    const { data, error } = await supabase
      .from("site_timetable_status")
      .upsert({
        id: 1,
        is_active: is_active !== false,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/teacher/tools");
    revalidatePath("/admin/teacher");
    revalidatePath("/admin/teacher-space");
    revalidatePath("/admin/settings");

    return {
      success: true,
      data: normalize(data as Record<string, unknown>),
      message: is_active
        ? "تم إظهار جدول الحصص العام في المنصة"
        : "تم إخفاء جدول الحصص العام عن الزوار",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
