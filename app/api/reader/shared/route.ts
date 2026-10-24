// GET  -> list of sources published to all families (any logged-in reader)
// POST -> publish a source (admins only). Page images must be PUT first to /api/reader/shared/<id>/img/<n>.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { isAdmin } from "@/lib/reader/users";
import { ID_RE, imgUrl, kImg, kSrc, listShared, saveIndex } from "@/lib/reader/shared";
import { kvGet, kvSet } from "@/lib/reader/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  if (!(await requireUser(req))) return unauthorized();
  return Response.json(await listShared(), { headers: noStore });
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  if (!isAdmin(user)) return Response.json({ error: "forbidden", detail: "只有管理员可以发布给所有家庭。" }, { status: 403 });
  const text = await req.text();
  if (text.length > 4_000_000) return Response.json({ error: "too large", detail: "内容太大了。" }, { status: 413 });
  let src: any;
  try { src = JSON.parse(text); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  const id = String(src.id || "").toLowerCase();
  if (!ID_RE.test(id) || !Array.isArray(src.pages) || !Array.isArray(src.sentences) || !Array.isArray(src.words)) {
    return Response.json({ error: "bad source", detail: "学习来源的格式不对。" }, { status: 400 });
  }
  // page images live in their own keys; keep only our proxy URL in the source
  for (const p of src.pages) {
    const n = Number(p.n);
    p.img = Number.isInteger(n) && n > 0 && (await kvGet(kImg(id, n))) ? imgUrl(id, n) : null;
  }
  const clean = {
    id, title: String(src.title || "未命名").slice(0, 80), titleZh: String(src.titleZh || "").slice(0, 80), kind: String(src.kind || "photo").slice(0, 12),
    createdAt: Number(src.createdAt) || Date.now(), publishedAt: Date.now(), by: user,
    pages: src.pages, sentences: src.sentences, words: src.words,
  };
  await kvSet(kSrc(id), JSON.stringify(clean));
  const items = (await listShared()).filter((x) => x.id !== id);
  items.unshift({
    id, title: clean.title, kind: clean.kind, pages: clean.pages.length, sentences: clean.sentences.length, words: clean.words.length,
    cover: clean.pages[0]?.img || null, createdAt: clean.publishedAt, by: user,
  });
  await saveIndex(items);
  return Response.json({ ok: true, id });
}
