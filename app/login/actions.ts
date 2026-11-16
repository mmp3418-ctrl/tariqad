"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/types";
import {
  clearSessionCookie,
  setSessionCookie,
  verifyAdminPassword,
} from "@/lib/auth";

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/announcements");

  if (!password) {
    return { success: false, error: "يرجى إدخال كلمة المرور" };
  }

  if (!process.env.ADMIN_PASSWORD) {
    return {
      success: false,
      error: "لم يتم ضبط ADMIN_PASSWORD في متغيرات البيئة",
    };
  }

  if (!verifyAdminPassword(password)) {
    return { success: false, error: "كلمة المرور غير صحيحة" };
  }

  await setSessionCookie();

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/announcements";
  redirect(safeNext);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
