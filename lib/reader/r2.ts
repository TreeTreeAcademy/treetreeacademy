// Optional Cloudflare R2 object store for page images and TTS clips. JSON stays in Upstash.
// Enabled only when READER_R2_ENABLED=1 and the R2_* credentials are set. Objects are always
// fetched through this server (or a private/signed path). Never use a public r2.dev URL.
import { createHash, createHmac } from "node:crypto";

export const r2Configured = () =>
  process.env.READER_R2_ENABLED === "1"
  && !!process.env.R2_ACCOUNT_ID
  && !!process.env.R2_ACCESS_KEY_ID
  && !!process.env.R2_SECRET_ACCESS_KEY
  && !!process.env.R2_BUCKET;

type Cfg = { bucket: string; endpoint: string; region: string; access: string; secret: string };
function cfg(): Cfg {
  const account = process.env.R2_ACCOUNT_ID!;
  return {
    bucket: process.env.R2_BUCKET!,
    endpoint: (process.env.R2_ENDPOINT || `https://${account}.r2.cloudflarestorage.com`).replace(/\/$/, ""),
    region: process.env.R2_REGION || "auto",
    access: process.env.R2_ACCESS_KEY_ID!,
    secret: process.env.R2_SECRET_ACCESS_KEY!,
  };
}

const sha256hex = (d: Buffer | string) => createHash("sha256").update(d).digest("hex");
const hmac = (key: Buffer | string, s: string) => createHmac("sha256", key).update(s).digest();
const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function rfc3986(s: string) { return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()); }

async function signed(method: string, key: string, body?: Uint8Array, contentType?: string, extraHeaders?: Record<string, string>) {
  const c = cfg();
  const now = new Date();
  const amz = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amz.slice(0, 8);
  const path = `/${c.bucket}/${key.split("/").map(rfc3986).join("/")}`;
  const host = new URL(c.endpoint).host;
  const payloadHash = body ? sha256hex(Buffer.from(body)) : EMPTY;
  const headers: Record<string, string> = {
    host,
    "x-amz-date": amz,
    "x-amz-content-sha256": payloadHash,
    ...(contentType ? { "content-type": contentType } : {}),
    ...(extraHeaders || {}),
  };
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v.trim();
  const names = Object.keys(lower).sort();
  const canonical = [
    method, path, "",
    names.map((n) => `${n}:${lower[n]}`).join("\n") + "\n",
    names.join(";"),
    payloadHash,
  ].join("\n");
  const outHeaders: Record<string, string> = { ...headers };
  const scope = `${day}/${c.region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amz}\n${scope}\n${sha256hex(canonical)}`;
  const kDate = hmac("AWS4" + c.secret, day);
  const kRegion = hmac(kDate, c.region);
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const sig = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  outHeaders.authorization = `AWS4-HMAC-SHA256 Credential=${c.access}/${scope}, SignedHeaders=${names.join(";")}, Signature=${sig}`;
  const r = await fetch(c.endpoint + path, { method, headers: outHeaders, body: body ? Buffer.from(body) : undefined });
  return r;
}

export async function r2Put(key: string, bytes: Uint8Array, contentType: string) {
  const r = await signed("PUT", key, bytes, contentType);
  if (!r.ok) throw new Error(`r2 put ${r.status}`);
}

export async function r2Get(key: string): Promise<{ bytes: Buffer; type: string } | null> {
  const r = await signed("GET", key);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`r2 get ${r.status}`);
  const bytes = Buffer.from(await r.arrayBuffer());
  const type = r.headers.get("content-type") || "application/octet-stream";
  return { bytes, type };
}

export async function r2Del(key: string) {
  const r = await signed("DELETE", key);
  if (!r.ok && r.status !== 404) throw new Error(`r2 del ${r.status}`);
}

export const r2ClipKey = (kind: "kk" | "tts", hash: string) => `clips/${kind}/${hash}`;
export const r2ImageKey = (user: string, id: string, n: number, ext = "bin") =>
  `books/${user}/${id}/p${String(n).padStart(3, "0")}.${ext}`;
