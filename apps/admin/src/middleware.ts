import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession, ADMIN_SESSION_COOKIE, ADMIN_SESSION_SECRET_FALLBACK } from "@/lib/adminSession";

// The real gate. Middleware runs BEFORE next.config rewrites and route
// handlers, so it's the one enforcement point a request can't slip past — the
// /api/* rewrite to the web app would otherwise bypass any check placed only
// on the proxy route handler. Unauthenticated page loads go to /login; API/
// proxy calls get a 401.
const SECRET = process.env.ADMIN_SESSION_SECRET ?? ADMIN_SESSION_SECRET_FALLBACK;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always-public: the login page and its auth endpoints
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await verifyAdminSession(token, SECRET)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/uploads/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next.js build assets and the favicon. Pages,
  // /api/*, /uploads/* and /login all pass through (login is exempted above).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
