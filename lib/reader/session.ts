// Reader login session — signed, httpOnly cookie. Works in Edge middleware and Node routes (Web Crypto).
// Secret comes ONLY from env: READER_SESSION_SECRET (32+ random chars).
export const READER_COOKIE = "tt_reader";
export const READER_MAX_AGE = 30 * 24 * 3600;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64url = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

function secret(): string | null {
  const s = process.env.READER_SESSION_SECRET;
  return s && s.length >= 16 ? s : null;
}

async function hmac(data: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

export async function signSession(user: string): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  const payload = `${b64url(enc.encode(user))}.${Math.floor(Date.now() / 1000) + READER_MAX_AGE}`;
  return `${payload}.${await hmac(payload, key)}`;
}

export async function verifySession(token: string | undefined | null): Promise<string | null> {
  const key = secret();
  if (!key || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[1])) return null;
  if (Number(parts[1]) < Date.now() / 1000) return null;
  const expect = await hmac(`${parts[0]}.${parts[1]}`, key);
  if (expect.length !== parts[2].length) return null;
  let diff = 0;
  for (let i = 0; i < expect.length; i++) diff |= expect.charCodeAt(i) ^ parts[2].charCodeAt(i);
  if (diff) return null;
  try { return new TextDecoder().decode(unb64url(parts[0])); } catch { return null; }
}

export function readCookie(req: Request): string | undefined {
  for (const part of (req.headers.get("cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === READER_COOKIE) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export async function requireUser(req: Request): Promise<string | null> {
  return verifySession(readCookie(req));
}

export const unauthorized = () =>
  Response.json({ error: "login required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
