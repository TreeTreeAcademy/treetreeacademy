// Serves the built-in book data (catalog.json, <id>/book.json, <id>/img/*) to logged-in readers only.
// The scanned pages / book text are NOT in this public repo. Configure ONE private source:
//   READER_ASSETS_BASE_URL  e.g. https://raw.githubusercontent.com/<org>/<private-repo>/main/books
//                           or a private S3/R2/Vercel Blob prefix
//   READER_ASSETS_TOKEN     optional bearer token sent to that origin (e.g. a fine-grained GitHub PAT, read-only)
//   READER_ASSETS_DIR       local folder (dev / self-hosting), e.g. /srv/treetree-reader-assets/books
import { requireUser, unauthorized } from "@/lib/reader/session";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".webp": "image/webp",
};

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!(await requireUser(req))) return unauthorized();
  const parts = (await ctx.params).path || [];
  if (!parts.length || parts.some((p) => !/^[\w\-.]+$/.test(p) || p.startsWith("."))) {
    return new Response("bad path", { status: 400 });
  }
  const rel = parts.join("/");
  const type = TYPES[path.extname(rel).toLowerCase()];
  if (!type) return new Response("not found", { status: 404 });
  const headers = { "Content-Type": type, "Cache-Control": "private, max-age=3600" };

  const dir = process.env.READER_ASSETS_DIR;
  if (dir) {
    try {
      const file = path.join(dir, rel);
      if (!file.startsWith(path.resolve(dir))) return new Response("bad path", { status: 400 });
      return new Response(new Uint8Array(await fs.readFile(file)), { headers });
    } catch {
      return new Response("not found", { status: 404 });
    }
  }
  const base = process.env.READER_ASSETS_BASE_URL;
  if (base) {
    const tok = process.env.READER_ASSETS_TOKEN;
    const r = await fetch(`${base.replace(/\/$/, "")}/${rel}`, {
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
      cache: "no-store",
    });
    if (!r.ok) return new Response("not found", { status: 404 });
    return new Response(r.body, { headers });
  }
  // nothing configured: empty catalog so the app still works with uploads only
  if (rel === "catalog.json") return Response.json([], { headers: { "Cache-Control": "no-store" } });
  return new Response("book assets not configured", { status: 404 });
}
