import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export const SESSION_COOKIE = "tariq_admin_session";
export const DEFAULT_ADMIN_PASSWORD = "tariq2026";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SESSION_PAYLOAD = "tariq-admin-authenticated-v1";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Always returns a usable password — never throws.
 * Order: env ADMIN_PASSWORD → hard default "tariq2026"
 */
export function getFallbackAdminPassword(): string {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_ADMIN_PASSWORD;
}

/**
 * Effective admin password — never throws, never blocks login.
 * 1) site_settings.admin_password (id = 1) when non-empty
 * 2) else process.env.ADMIN_PASSWORD || "tariq2026"
 */
export async function getEffectiveAdminPassword(): Promise<string> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    // Skip DB when env still has placeholder URL
    if (url && !url.includes("your-project")) {
      const { data, error } = await supabase
        .from("site_settings")
        .select("admin_password")
        .eq("id", 1)
        .maybeSingle();

      if (!error && data) {
        const dbPassword = (data as { admin_password?: string | null })
          .admin_password;
        if (typeof dbPassword === "string" && dbPassword.trim().length > 0) {
          return dbPassword.trim();
        }
      }
    }
  } catch {
    // Network / schema / client failures → fallback
  }

  return getFallbackAdminPassword();
}

/** Must match the Edge middleware HMAC token format (hex). */
export function createSessionToken(password: string): string {
  return createHmac("sha256", password).update(SESSION_PAYLOAD).digest("hex");
}

export function verifySessionToken(
  token: string | undefined,
  password: string
): boolean {
  if (!token || !password) return false;
  try {
    return safeEqual(token, createSessionToken(password));
  } catch {
    return false;
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  try {
    const expected = await getEffectiveAdminPassword();
    return safeEqual(password, expected);
  } catch {
    // Absolute last resort: compare against hard default
    return safeEqual(password, DEFAULT_ADMIN_PASSWORD);
  }
}

export async function setSessionCookie(password?: string): Promise<void> {
  const secret = password ?? (await getEffectiveAdminPassword());
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const password = await getEffectiveAdminPassword();
    return verifySessionToken(token, password);
  } catch {
    return false;
  }
}
