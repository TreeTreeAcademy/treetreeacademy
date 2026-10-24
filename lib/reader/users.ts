// Reader accounts come ONLY from env READER_USERS (no passwords in code).
// Format: "name:scrypt$<saltB64url>$<hashB64url>;name2:scrypt$...$...[:admin]"
// Admins (may publish uploads to all families): append ":admin" to an entry, or list names in READER_ADMINS="a,b".
// Generate an entry with:  node scripts/reader-hash-password.mjs <name> <password>
import { scryptSync, timingSafeEqual } from "crypto";

function users(): Map<string, string> {
  const m = new Map<string, string>();
  for (const entry of (process.env.READER_USERS || "").split(/[;\n]/)) {
    const i = entry.indexOf(":");
    if (i > 0) m.set(entry.slice(0, i).trim().toLowerCase(), entry.slice(i + 1).trim());
  }
  return m;
}

export function isAdmin(user: string | null | undefined): boolean {
  if (!user) return false;
  const u = user.trim().toLowerCase();
  if ((process.env.READER_ADMINS || "").split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).includes(u)) return true;
  return /:admin$/i.test(users().get(u) || "");
}

export function userExists(name: string): boolean {
  return users().has(name.trim().toLowerCase());
}

export function readerConfigured(): boolean {
  return users().size > 0 && !!process.env.READER_SESSION_SECRET;
}

export function checkPassword(name: string, password: string): string | null {
  const user = name.trim().toLowerCase();
  const rec = users().get(user);
  // always do the scrypt work so timing doesn't reveal which names exist
  const [alg, salt, hash] = ((rec || "").replace(/:admin$/i, "") || "scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA").split("$");
  if (alg !== "scrypt" || !salt || !hash) return null;
  const want = Buffer.from(hash, "base64url");
  const got = scryptSync(password, Buffer.from(salt, "base64url"), want.length || 32);
  return rec && want.length === got.length && timingSafeEqual(want, got) ? user : null;
}
