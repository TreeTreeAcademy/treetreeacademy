// Importer handshake: GET -> where page images will be stored (blob | kv) and store kind. Bearer READER_IMPORT_TOKEN.
import { importAuthorized, importDenied } from "@/lib/reader/importauth";
import { blobConfigured } from "@/lib/reader/blob";
import { kvStats, storeKind } from "@/lib/reader/store";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  if (!importAuthorized(req)) return importDenied();
  return Response.json({ ok: true, images: blobConfigured() ? "blob" : "kv", store: storeKind(), kv: await kvStats() }, { headers: { "Cache-Control": "no-store" } });
}
