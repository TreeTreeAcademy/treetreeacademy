// Optional server-side progress per reader (otherwise progress lives in the browser's localStorage).
// Uses the same Upstash / Vercel KV REST env vars as /plan: KV_REST_API_URL + KV_REST_API_TOKEN.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { kvConfig } from "@/lib/plan/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const key = (u: string) => `reader:progress:${u}`;

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const kv = kvConfig();
  if (!kv) return Response.json({ error: "server storage not configured" }, { status: 501 });
  const r = await fetch(`${kv.url}/get/${encodeURIComponent(key(user))}`, { headers: { Authorization: `Bearer ${kv.token}` }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return new Response(j.result || "null", { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const kv = kvConfig();
  if (!kv) return Response.json({ error: "server storage not configured" }, { status: 501 });
  const body = await req.text();
  if (body.length > 1_000_000) return Response.json({ error: "too large" }, { status: 413 });
  try { JSON.parse(body); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  const r = await fetch(`${kv.url}/set/${encodeURIComponent(key(user))}`, {
    method: "POST", headers: { Authorization: `Bearer ${kv.token}` }, body, cache: "no-store",
  });
  return Response.json({ ok: r.ok }, { status: r.ok ? 200 : 502 });
}
