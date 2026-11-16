import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import type { AdminRole, SessionUser } from "@/lib/types";

export const SESSION_COOKIE = "tariq_admin_session";
export const USER_COOKIE = "tariq_admin_user";
export const ROLE_COOKIE = "tariq_admin_role";

export const FALLBACK_USERNAME = "admin";
export const FALLBACK_PASSWORD = "tariq2026";
export const FALLBACK_ROLE: AdminRole = "admin";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const SESSION_PAYLOAD_PREFIX = "tariq-admin-user-v2:";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSessionToken(username: string, password: string): string {
  return createHmac("sha256", password)
    .update(`${SESSION_PAYLOAD_PREFIX}${username}`)
    .digest("hex");
}

export function verifySessionToken(
  token: string | undefined,
  username: string,
  password: string
): boolean {
  if (!token || !username || !password) return false;
  try {
    return safeEqual(token, createSessionToken(username, password));
  } catch {
    return false;
  }
}

export type ResolvedUser = {
  username: string;
  password: string;
  role: AdminRole;
  source: "database" | "fallback";
};

/** Look up a user by username from admin_users, or return fallback credentials. */
export async function resolveUserByUsername(
  username: string
): Promise<ResolvedUser | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    if (url && !url.includes("your-project")) {
      const { data, error } = await supabase
        .from("admin_users")
        .select("username, password, role")
        .ilike("username", normalized)
        .maybeSingle();

      if (!error && data) {
        const row = data as {
          username: string;
          password: string;
          role: AdminRole;
        };
        if (row.password) {
          return {
            username: row.username,
            password: row.password,
            role: row.role === "helper" ? "helper" : "admin",
            source: "database",
          };
        }
      }
    }
  } catch {
    // fall through
  }

  if (normalized === FALLBACK_USERNAME) {
    return {
      username: FALLBACK_USERNAME,
      password: FALLBACK_PASSWORD,
      role: FALLBACK_ROLE,
      source: "fallback",
    };
  }

  return null;
}

export async function authenticateCredentials(
  username: string,
  password: string
): Promise<ResolvedUser | null> {
  const user = await resolveUserByUsername(username);
  if (!user) return null;
  if (!safeEqual(password, user.password)) return null;
  return user;
}

export async function setSessionCookies(user: ResolvedUser): Promise<void> {
  const cookieStore = await cookies();
  const token = createSessionToken(user.username, user.password);
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
  cookieStore.set(SESSION_COOKIE, token, common);
  cookieStore.set(USER_COOKIE, user.username, common);
  cookieStore.set(ROLE_COOKIE, user.role, common);
}

export async function clearSessionCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(USER_COOKIE);
  cookieStore.delete(ROLE_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    const username = cookieStore.get(USER_COOKIE)?.value;
    const role = cookieStore.get(ROLE_COOKIE)?.value as AdminRole | undefined;
    if (!token || !username) return null;

    const user = await resolveUserByUsername(username);
    if (!user) return null;
    if (!verifySessionToken(token, user.username, user.password)) return null;

    return {
      username: user.username,
      role: role === "helper" || user.role === "helper" ? "helper" : "admin",
    };
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionUser()) !== null;
}
