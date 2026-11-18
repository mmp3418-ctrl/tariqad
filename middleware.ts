import { NextResponse, type NextRequest } from "next/server";

/**
 * Normalize trailing slashes so refresh on /admin/settings/ never 404s
 * when trailingSlash is false in next.config.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.length > 1 && pathname.endsWith("/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
