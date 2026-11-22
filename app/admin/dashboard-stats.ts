import { supabase } from "@/lib/supabase";

export type DashboardStats = {
  tutorials: number;
  references: number;
  questions: number;
  activeSocialChannels: number;
  activeTools: number;
  totalTools: number;
  timetableActive: boolean | null;
};

async function safeTableCount(
  table: string,
  eq?: { column: string; value: boolean | string }
): Promise<number> {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (eq) {
      query = query.eq(eq.column, eq.value);
    }
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function safeToolCounts(): Promise<{ active: number; total: number }> {
  try {
    const { data, error } = await supabase
      .from("site_tool_settings")
      .select("is_active");
    if (error || !data?.length) return { active: 0, total: 0 };
    const total = data.length;
    const active = data.filter((row) => row.is_active !== false).length;
    return { active, total };
  } catch {
    return { active: 0, total: 0 };
  }
}

async function safeTimetableActive(): Promise<boolean | null> {
  try {
    const { data, error } = await supabase
      .from("site_timetable_status")
      .select("is_active")
      .eq("status_key", "default")
      .maybeSingle();
    if (error) return null;
    if (!data) return null;
    return data.is_active !== false;
  } catch {
    return null;
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    tutorials,
    references,
    questions,
    activeSocialChannels,
    toolCounts,
    timetableActive,
  ] = await Promise.all([
    safeTableCount("teacher_tutorials"),
    safeTableCount("teacher_references"),
    safeTableCount("question_bank"),
    safeTableCount("social_links", { column: "is_active", value: true }),
    safeToolCounts(),
    safeTimetableActive(),
  ]);

  return {
    tutorials,
    references,
    questions,
    activeSocialChannels,
    activeTools: toolCounts.active,
    totalTools: toolCounts.total,
    timetableActive,
  };
}