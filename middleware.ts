import { NextResponse, type NextRequest } from "next/server";
import { READER_COOKIE, verifySession } from "@/lib/reader/session";

// Everything under /reader (static app in public/reader) and /api/reader/* requires a reader login,
// except the login endpoint itself.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/api/reader/login") return NextResponse.next();
  const user = await verifySession(req.cookies.get(READER_COOKIE)?.value);
  if (user) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "login required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/reader", "/reader/:path*", "/api/reader/:path*"] };
