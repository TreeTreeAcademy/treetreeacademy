// Bearer auth for the box-side book importer (scripts/import-book.ts). Token comes ONLY from env READER_IMPORT_TOKEN
// (32+ random chars). Without it the import API is disabled (404). Never logged or returned.
import { timingSafeEqual } from "crypto";

export function importAuthorized(req: Request): boolean {
  const want = process.env.READER_IMPORT_TOKEN || "";
  if (want.length < 32) return false;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(want), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const importDenied = () => Response.json({ error: "not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
