// GET  -> this reader's own books (imported PDFs + books made with the in-app batch upload).
//         GET ?budget=1 -> storage headroom {freeMB, usedMB, budgetMB} (page images live in KV when there is no Blob store).
// POST -> save a book assembled in the browser by the batch uploader (page images were PUT to /mybooks/<id>/img/<n> first).
//         Private to the logged-in reader; never published to other families.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { BATCH_ID_RE, checkBatchSource, kvHeadroom, listBooks, saveBook } from "@/lib/reader/mybooks";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const NS = { "Cache-Control": "no-store" };
const MB = (n: number | null) => (n == null ? null : Math.round((n / 1048576) * 10) / 10);

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  if (new URL(req.url).searchParams.get("budget")) {
    const h = await kvHeadroom();
    return Response.json({ usedMB: MB(h.usedBytes), budgetMB: MB(h.budgetBytes), freeMB: MB(h.freeBytes) }, { headers: NS });
  }
  return Response.json(await listBooks(user), { headers: NS });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const text = await req.text();
  if (text.length > 4_000_000) return Response.json({ error: "too_large", detail: "这本书的文字太多了，请分成两本上传。" }, { status: 413, headers: NS });
  let j: any;
  try { j = JSON.parse(text); } catch { return Response.json({ error: "bad_json" }, { status: 400, headers: NS }); }
  const src = j?.source;
  if (!src || !BATCH_ID_RE.test(String(src.id))) return Response.json({ error: "bad_id" }, { status: 400, headers: NS });
  let bad: string | null;
  try { bad = checkBatchSource(src); } catch (e: any) { bad = String(e?.message || "bad source"); }
  if (bad) return Response.json({ error: "bad_source", detail: bad }, { status: 400, headers: NS });
  const imgStore = j.imgStore === "blob" ? "blob" : "kv";
  const imgBytes = Math.max(0, Math.min(200_000_000, Number(j.imgBytes) || 0));
  const out = await saveBook(user, { ...src, kind: "book", source: "batch-upload" }, { imgStore, imgBytes });
  return Response.json({ ok: true, ...out }, { headers: NS });
}
