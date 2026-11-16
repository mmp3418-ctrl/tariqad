import { isAuthenticated } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function requireAuth(): Promise<ActionResult<never> | null> {
  if (!(await isAuthenticated())) {
    return { success: false, error: "غير مصرح — يرجى تسجيل الدخول" };
  }
  return null;
}
