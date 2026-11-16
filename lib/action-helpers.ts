import { isAuthenticated } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export async function requireAuth<T = undefined>(): Promise<ActionResult<T> | null> {
  if (!(await isAuthenticated())) {
    return { success: false, error: "غير مصرح — يرجى تسجيل الدخول" };
  }
  return null;
}
