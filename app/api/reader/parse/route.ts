// Upload (photo / screenshot / audio / pasted text) -> Learning Source JSON.
// Direct Gemini when GEMINI_API_KEY is set; otherwise falls back to the optional Python worker (READER_WORKER_URL).
// Bodies over ~4.5 MB can't reach a Vercel Function: the app uploads those to Vercel Blob first and sends {blobUrl}.
import { requireUser, unauthorized } from "@/lib/reader/session";
import { forward, workerConfigured } from "@/lib/reader/worker";
import { aiConfigured, aiErrorResponse } from "@/lib/reader/ai";
import { parseMedia, parseText } from "@/lib/reader/parse";
import { consume, limitResponse, maxFor, remaining } from "@/lib/reader/limits";
import { blobPrefix, readPrivateBlob, deleteBlob } from "@/lib/reader/blob";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const AUDIO_EXT = /\.(m4a|mp3|wav|webm|ogg|oga|aac|mp4|caf|flac|aiff?)$/i;
const MIME: Record<string, string> = { m4a: "audio/mp4", mp4: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", webm: "audio/webm", ogg: "audio/ogg", oga: "audio/ogg", aac: "audio/aac", flac: "audio/flac", aif: "audio/aiff", aiff: "audio/aiff", caf: "audio/x-caf" };
const maxBytes = () => Number(process.env.MAX_UPLOAD_MB || 25) * 1048576;
const bad = (status: number, detail: string) => Response.json({ error: "bad_request", detail }, { status });

function classify(type: string, name: string): { kind: "photo" | "audio"; mime: string } | null {
  const t = (type || "").toLowerCase().split(";")[0];
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (t.startsWith("audio/") || t.startsWith("video/") || AUDIO_EXT.test(name)) {
    return { kind: "audio", mime: t.startsWith("audio/") ? t : MIME[ext] || (t === "video/mp4" ? "audio/mp4" : t === "video/webm" ? "audio/webm" : t || "audio/mpeg") };
  }
  if (t.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(name)) return { kind: "photo", mime: t.startsWith("image/") ? t : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : /hei[cf]/.test(ext) ? "image/heic" : "image/jpeg" };
  return null;
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  if (!aiConfigured()) {
    if (workerConfigured()) return forward("/parse", await req.arrayBuffer(), req.headers.get("content-type"));
    return Response.json({ error: "ai_not_configured", detail: "还没有配置 AI（GEMINI_API_KEY）。" }, { status: 501 });
  }
  if ((await remaining("uploads", user)) <= 0) return limitResponse("uploads", maxFor("uploads", user));

  const ct = req.headers.get("content-type") || "";
  try {
    // 1) large file already in Vercel Blob (private): {blobUrl, contentType, name, title}
    if (ct.includes("application/json")) {
      const j = await req.json().catch(() => ({}));
      const prefix = blobPrefix(user);
      if (typeof j.blobUrl !== "string") return bad(400, "上传文件的位置不对，请重新上传。");
      const bytes = await readPrivateBlob(j.blobUrl, prefix, maxBytes());
      try {
        const c = classify(String(j.contentType || ""), String(j.name || j.pathname));
        if (!c) return bad(415, "不支持这种文件，请上传照片（jpg/png）或录音（m4a/mp3/wav）。");
        const out = await parseMedia(bytes, c.mime, c.kind, String(j.title || "").slice(0, 80));
        await consume("uploads", user);
        return Response.json({ ...out.src, _ai: out.meta });
      } finally {
        await deleteBlob(j.blobUrl); // uploads are not kept on the server
      }
    }
    // 2) multipart: file OR text
    const f = await req.formData();
    const title = String(f.get("title") || "").slice(0, 80);
    const file = f.get("file");
    if (file && typeof file !== "string") {
      if (file.size > maxBytes()) return bad(413, `文件太大了（上限 ${process.env.MAX_UPLOAD_MB || 25} MB）。`);
      const c = classify(file.type, file.name || "");
      if (!c) return bad(415, "不支持这种文件，请上传照片（jpg/png）或录音（m4a/mp3/wav）。");
      const out = await parseMedia(new Uint8Array(await file.arrayBuffer()), c.mime, c.kind, title);
      await consume("uploads", user);
      return Response.json({ ...out.src, _ai: out.meta });
    }
    const text = String(f.get("text") || "");
    if (!text.trim()) return bad(400, "没有收到文件或文字。");
    if (text.length > 60000) return bad(413, "文字太长了，请分成几段上传。");
    const out = await parseText(text, title, String(f.get("kind") || "text"));
    await consume("uploads", user);
    return Response.json({ ...out.src, _ai: out.meta });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
