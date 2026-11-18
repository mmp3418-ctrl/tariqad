"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { ActionResult, SiteToolSetting } from "@/lib/types";

const GRADE_CALCULATOR_KEY = "grade_calculator";

function normalizeTool(row: Record<string, unknown>): SiteToolSetting {
  return {
    id: String(row.id),
    tool_key: String(row.tool_key ?? ""),
    is_active: row.is_active !== false,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function revalidateTools() {
  revalidatePath("/admin/teacher/tools");
  revalidatePath("/admin/teacher");
  revalidatePath("/admin/teacher-space");
}

export async function getToolSettings(): Promise<
  ActionResult<SiteToolSetting[]>
> {
  try {
    const existing = await supabase
      .from("site_tool_settings")
      .select("*")
      .eq("tool_key", GRADE_CALCULATOR_KEY)
      .maybeSingle();
    if (existing.error) return { success: false, error: existing.error.message };
    if (!existing.data) {
      const inserted = await supabase.from("site_tool_settings").insert({
        tool_key: GRADE_CALCULATOR_KEY,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      if (inserted.error) {
        return { success: false, error: inserted.error.message };
      }
    }
    const { data, error } = await supabase
      .from("site_tool_settings")
      .select("*")
      .order("tool_key", { ascending: true });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: (data ?? []).map((row) =>
        normalizeTool(row as Record<string, unknown>)
      ),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function setToolActive(
  toolKey: string,
  is_active: boolean
): Promise<ActionResult<SiteToolSetting>> {
  try {
    const key = toolKey.trim();
    if (!key) return { success: false, error: "مفتاح الأداة غير صالح" };
    const { data, error } = await supabase
      .from("site_tool_settings")
      .upsert(
        {
          tool_key: key,
          is_active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tool_key" }
      )
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    if (key === GRADE_CALCULATOR_KEY) {
      await supabase.from("teacher_space_settings").upsert({
        id: 1,
        grade_calculator_active: is_active,
        updated_at: new Date().toISOString(),
      });
    }
    revalidateTools();
    return {
      success: true,
      data: normalizeTool(data as Record<string, unknown>),
      message:
        key === GRADE_CALCULATOR_KEY
          ? is_active
            ? "تم تفعيل آلة حساب الدرجات"
            : "تم إيقاف آلة حساب الدرجات"
          : is_active
            ? "تم تفعيل الأداة"
            : "تم إيقاف الأداة",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
