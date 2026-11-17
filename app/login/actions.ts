"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/types";
import {
  authenticateCredentials,
  clearSessionCookies,
  setSessionCookies,
} from "@/lib/auth";

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const next = String(formData.get("next") ?? "/grades");

    if (!username.trim() || !password) {
      return { success: false, error: "يرجى إدخال اسم المستخدم وكلمة المرور" };
    }

    const user = await authenticateCredentials(username, password);
    if (!user) {
      return { success: false, error: "بيانات الدخول غير صحيحة" };
    }

    await setSessionCookies(user);

    const blocked =
      next.startsWith("/announcements") || next.includes("advert");
    const safeNext =
      next.startsWith("/") && !next.startsWith("//") && !blocked
        ? next
        : "/grades";
    redirect(safeNext);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      String((err as { digest: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("[tariq-admin] loginAction:", err);
    return {
      success: false,
      error: "تعذر تسجيل الدخول حالياً. حاول مرة أخرى.",
    };
  }
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookies();
  redirect("/login");
}
