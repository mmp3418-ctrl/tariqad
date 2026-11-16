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

/** Env fallback when DB password is empty/null. */
export function getFallbackAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

/**
 * Effective admin password:
 * 1) site_settings.admin_password (id = 1) when non-empty
 * 2) else process.env.ADMIN_PASSWORD || "tariq2026"
 */
export async function getEffectiveAdminPassword(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("admin_password")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) {
      const dbPassword = (data as { admin_password?: string | null })
        .admin_password;
      if (typeof dbPassword === "string" && dbPassword.trim()) {
        return dbPassword.trim();
      }
    }
  } catch {
    // Fall through to env/default
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
  try {
    const expected = await getEffectiveAdminPassword();
    return safeEqual(password, expected);
  } catch {
    return false;
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
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const password = await getEffectiveAdminPassword();
  return verifySessionToken(token, password);
}
