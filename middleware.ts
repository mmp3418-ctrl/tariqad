import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "tariq_admin_session";
const PUBLIC_PATHS = ["/login"];

async function createSessionToken(password: string): Promise<string> {
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
    encoder.encode("tariq-admin-authenticated-v1")
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

async function verifySessionToken(
  token: string | undefined,
  password: string | undefined
): Promise<boolean> {
  if (!token || !password) return false;
  try {
    const expected = await createSessionToken(password);
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

  const password = process.env.ADMIN_PASSWORD;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token, password);

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
