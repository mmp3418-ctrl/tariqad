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
  try {
    const password = String(formData.get("password") ?? "");
    const next = String(formData.get("next") ?? "/announcements");

    if (!password.trim()) {
      return { success: false, error: "يرجى إدخال كلمة المرور" };
    }

    // DB password → env ADMIN_PASSWORD → "tariq2026" (never blocks on missing env)
    const isValid = await verifyAdminPassword(password);
    if (!isValid) {
      return { success: false, error: "كلمة المرور غير صحيحة" };
    }

    const effective = await getEffectiveAdminPassword();
    await setSessionCookie(effective);

    const safeNext =
      next.startsWith("/") && !next.startsWith("//") ? next : "/announcements";
    redirect(safeNext);
  } catch (err) {
    // Next.js redirect() throws a special error — rethrow it
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }

    console.error("[tariq-admin] loginAction error:", err);
    return {
      success: false,
      error: "تعذر تسجيل الدخول حالياً. حاول مرة أخرى.",
    };
  }
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
