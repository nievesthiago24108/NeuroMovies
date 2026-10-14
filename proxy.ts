import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuthEnabled, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Optimistic, cookie-only auth gate (Next 16 renamed `middleware` to `proxy`).
 *
 * Redirects unauthenticated visitors to `/login`, preserving the target path in
 * the `next` query parameter. Real data protection lives in the Server Actions
 * (`requireSession`) — this only filters requests early.
 */
export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const authenticated = await verifySessionToken(token);

  if (pathname === "/login") {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (authenticated) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  const target = `${pathname}${search}`;
  if (target && target !== "/") loginUrl.searchParams.set("next", target);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml|webmanifest)$).*)",
  ],
};
