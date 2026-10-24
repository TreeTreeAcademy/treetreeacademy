import { checkPassword, readerConfigured } from "@/lib/reader/users";
import { READER_COOKIE, READER_MAX_AGE, signSession } from "@/lib/reader/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fails = new Map<string, { n: number; t: number }>(); // best-effort throttle per instance

function safeNext(n: string): string {
  return /^\/reader(\/[\w\-./]*)?$/.test(n) ? n : "/reader";
}

export async function POST(req: Request) {
  let name = "", pw = "", next = "/reader";
  try {
    const f = await req.formData();
    name = String(f.get("username") || "");
    pw = String(f.get("password") || "");
    next = safeNext(String(f.get("next") || "/reader"));
  } catch { /* ignore */ }
  const back = (q: string) =>
    new Response(null, { status: 303, headers: { Location: `/login?next=${encodeURIComponent(next)}${q}` } });
  if (!readerConfigured()) return back("&err=config");

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  const f = fails.get(ip);
  if (f && f.n >= 5 && Date.now() - f.t < 10 * 60 * 1000) return back("&err=wait");

  const user = checkPassword(name, pw);
  if (!user) {
    fails.set(ip, { n: (f && Date.now() - f.t < 600000 ? f.n : 0) + 1, t: Date.now() });
    return back("&err=1");
  }
  fails.delete(ip);
  const token = await signSession(user);
  if (!token) return back("&err=config");
  const secure = new URL(req.url).protocol === "https:" ? " Secure;" : "";
  return new Response(null, {
    status: 303,
    headers: {
      Location: next,
      "Set-Cookie": `${READER_COOKIE}=${token}; Path=/; Max-Age=${READER_MAX_AGE}; HttpOnly;${secure} SameSite=Lax`,
    },
  });
}
