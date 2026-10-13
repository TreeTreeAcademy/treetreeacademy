import { COOKIE, MAX_AGE, makeToken, missingEnv, passwordOk } from "@/lib/plan/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const back = (q: string) => new Response(null, { status: 303, headers: { Location: "/plan" + q } });
  if (missingEnv().length) return back("");
  let pw = "";
  try { pw = String((await req.formData()).get("password") || ""); } catch { /* ignore */ }
  if (!passwordOk(pw)) return back("?err=1");
  const res = back("");
  res.headers.append("Set-Cookie", `${COOKIE}=${makeToken()}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`);
  return res;
}
