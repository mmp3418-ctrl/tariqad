"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { requireAuth } from "@/lib/action-helpers";
import type { ActionResult, AdminRole, AdminUserPublic } from "@/lib/types";

export async function getAdminUsers(): Promise<ActionResult<AdminUserPublic[]>> {
  const authError = await requireAuth<AdminUserPublic[]>();
  if (authError) return authError;

  const { data, error } = await supabase
    .from("admin_users")
    .select("id, username, role, created_at")
    .order("created_at", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as AdminUserPublic[]) ?? [] };
}

export async function createAdminUser(input: {
  username: string;
  password: string;
  role: AdminRole;
}): Promise<ActionResult<AdminUserPublic>> {
  const authError = await requireAuth<AdminUserPublic>();
  if (authError) return authError;

  const username = input.username.trim().toLowerCase();
  const password = input.password.trim();

  if (!username || !password) {
    return { success: false, error: "اسم المستخدم وكلمة المرور مطلوبان" };
  }
  if (password.length < 6) {
    return { success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" };
  }

  const { data, error } = await supabase
    .from("admin_users")
    .insert({
      username,
      password,
      role: input.role === "admin" ? "admin" : "helper",
    })
    .select("id, username, role, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "اسم المستخدم موجود مسبقاً" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/users");
  return {
    success: true,
    data: data as AdminUserPublic,
    message: "تم إضافة المشرف بنجاح",
  };
}

export async function deleteAdminUser(id: string): Promise<ActionResult> {
  const authError = await requireAuth();
  if (authError) return authError;

  const { error } = await supabase.from("admin_users").delete().eq("id", id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/users");
  return { success: true, message: "تم حذف المستخدم" };
}
