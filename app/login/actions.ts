"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/types";
import {
  clearSessionCookie,
  getEffectiveAdminPassword,
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

  if (!(await verifyAdminPassword(password))) {
    return { success: false, error: "كلمة المرور غير صحيحة" };
  }

  const effective = await getEffectiveAdminPassword();
  await setSessionCookie(effective);

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/announcements";
  redirect(safeNext);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
