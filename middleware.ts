import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "tariq_admin_session";
const USER_COOKIE = "tariq_admin_user";
const PUBLIC_PATHS = ["/login"];
const FALLBACK_USERNAME = "admin";
const FALLBACK_PASSWORD = "tariq2026";
const SESSION_PAYLOAD_PREFIX = "tariq-admin-user-v2:";

async function createSessionToken(
  username: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${SESSION_PAYLOAD_PREFIX}${username}`)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function fetchUserPassword(
  username: string
): Promise<{ password: string; role: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-project")) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/admin_users?username=ilike.${encodeURIComponent(username)}&select=username,password,role&limit=1`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      password?: string;
      role?: string;
    }>;
    const row = rows?.[0];
    if (row?.password) {
      return { password: row.password, role: row.role || "admin" };
    }
    return null;
  } catch {
    return null;
  }
}

async function resolvePassword(username: string): Promise<string | null> {
  const db = await fetchUserPassword(username);
  if (db?.password) return db.password;
  if (username.toLowerCase() === FALLBACK_USERNAME) return FALLBACK_PASSWORD;
  return null;
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const username = request.cookies.get(USER_COOKIE)?.value;
  if (!token || !username) return false;

  const password = await resolvePassword(username);
  if (!password) return false;

  try {
    const expected = await createSessionToken(username, password);
    return timingSafeEqual(token, expected);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const authenticated = await isAuthenticated(request);
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!authenticated && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/announcements", request.url));
  }

  if (!authenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
