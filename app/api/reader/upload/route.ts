// Vercel Blob client-upload token endpoint (browser uploads big audio/photos straight to a PRIVATE blob,
// bypassing the 4.5 MB function body limit). /api/reader/parse then reads it, processes it and deletes it.
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireUser, unauthorized } from "@/lib/reader/session";
import { blobConfigured, blobPrefix } from "@/lib/reader/blob";
import { limitResponse, maxFor, remaining } from "@/lib/reader/limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  if (!blobConfigured()) return Response.json({ error: "blob_not_configured", detail: "大文件上传还没有开通（需要 Vercel Blob）。" }, { status: 501 });
  if ((await remaining("uploads", user)) <= 0) return limitResponse("uploads", maxFor("uploads", user));
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body, request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(blobPrefix(user)) || pathname.includes("..")) throw new Error("bad pathname");
        return {
          allowedContentTypes: ["image/*", "audio/*", "video/mp4", "video/webm", "video/quicktime"],
          maximumSizeInBytes: Number(process.env.MAX_UPLOAD_MB || 25) * 1048576,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
          tokenPayload: user,
        };
      },
    });
    return Response.json(json);
  } catch (e: any) {
    return Response.json({ error: "upload_token", detail: "无法开始上传，请重试。" }, { status: 400 });
  }
}
