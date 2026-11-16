import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "tariq_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const SESSION_PAYLOAD = "tariq-admin-authenticated-v1";

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not configured");
  }
  return password;
}

/** Must match the Edge middleware HMAC token format (hex). */
export function createSessionToken(): string {
  return createHmac("sha256", getAdminPassword())
    .update(SESSION_PAYLOAD)
    .digest("hex");
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const expected = createSessionToken();
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyAdminPassword(password: string): boolean {
  try {
    const expected = getAdminPassword();
    const a = Buffer.from(password);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function setSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(), {
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
  return verifySessionToken(token);
}
