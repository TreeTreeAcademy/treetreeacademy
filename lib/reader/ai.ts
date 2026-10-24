// Gemini client for the reader (server-only). Key comes ONLY from env GEMINI_API_KEY — never logged or returned.
//   GEMINI_MODEL            preferred model (default gemini-3.5-flash-lite)
//   GEMINI_FALLBACK_MODELS  comma list tried when the preferred model is unavailable / out of daily quota
//   GEMINI_BASE_URL         override (tests / proxies); default https://generativelanguage.googleapis.com/v1beta
//   GEMINI_TIMEOUT_MS       per request (default 90000)
export type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }
  | { file_data: { mime_type: string; file_uri: string } };

export class AIError extends Error {
  status: number; code: string; zh: string;
  constructor(status: number, code: string, zh: string, msg?: string) {
    super(msg || code); this.status = status; this.code = code; this.zh = zh;
  }
}

const base = () => (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const key = () => process.env.GEMINI_API_KEY || "";
export const aiConfigured = () => !!key();

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_FALLBACKS = "gemini-3.1-flash-lite,gemini-2.5-flash-lite,gemini-3.6-flash,gemini-2.5-flash";
export function modelChain(): string[] {
  const all = [process.env.GEMINI_MODEL || DEFAULT_MODEL, ...(process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACKS).split(",")]
    .map((s) => s.trim().replace(/^models\//, "")).filter(Boolean);
  return [...new Set(all)];
}
// per-instance memory: which model last worked, which are unavailable / out of quota today
let working: string | null = null;
const skip = new Map<string, number>(); // model -> skip until (ms)
export const currentModel = () => working || modelChain()[0];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const parseDelay = (s?: string) => { const m = /^([\d.]+)s$/.exec(s || ""); return m ? Math.ceil(parseFloat(m[1]) * 1000) : 0; };

type Raw = { status: number; json: any; text: string };
async function post(path: string, body: unknown, timeoutMs?: number): Promise<Raw> {
  const r = await fetch(`${base()}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key() },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs || Number(process.env.GEMINI_TIMEOUT_MS || 90000)),
  });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-JSON error page */ }
  return { status: r.status, json, text };
}

function quotaInfo(j: any) {
  const det: any[] = j?.error?.details || [];
  const retry = det.find((d) => String(d["@type"]).includes("RetryInfo"));
  const qf = det.find((d) => String(d["@type"]).includes("QuotaFailure"));
  const ids = (qf?.violations || []).map((v: any) => `${v.quotaId || ""} ${v.quotaMetric || ""}`).join(" ");
  const msg = String(j?.error?.message || "");
  const daily = /PerDay|per day|daily/i.test(ids + " " + msg);
  return { delay: parseDelay(retry?.retryDelay), daily, ids };
}

const ZH = {
  busy: "AI 服务现在有点忙（免费额度每分钟有限速），请等一分钟再试。",
  daily: "今天的免费 AI 额度已经用完了，请明天再试（或在 Google AI Studio 开通付费）。",
  key: "AI 密钥无效或没有权限，请检查 GEMINI_API_KEY。",
  safety: "这段内容被 AI 安全过滤拦下了，换一张照片或一段录音试试。",
  long: "内容太长了，请分成几段上传。",
  bad: "AI 返回的内容格式不对，请再试一次。",
  down: "AI 服务暂时连不上，请稍后再试。",
  model: "没有可用的 AI 模型，请检查 GEMINI_MODEL 设置。",
  none: "还没有配置 AI（GEMINI_API_KEY）。",
};

type GenOpts = { temperature?: number; maxOutputTokens?: number; timeoutMs?: number };
type GenResult<T> = { data: T; model: string; ms: number; usage?: any; retries: number };

let schemaField: "responseJsonSchema" | "responseSchema" = "responseJsonSchema";

async function callModel(model: string, parts: Part[], schema: object, o: GenOpts): Promise<{ raw: Raw; retries: number }> {
  const deadline = Date.now() + Number(process.env.GEMINI_RETRY_BUDGET_MS || 45000);
  let retries = 0;
  for (let attempt = 0; ; attempt++) {
    const body = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        [schemaField]: schema,
        temperature: o.temperature ?? 0.2,
        maxOutputTokens: o.maxOutputTokens ?? 8192,
      },
    };
    let raw: Raw;
    try {
      raw = await post(`models/${encodeURIComponent(model)}:generateContent`, body, o.timeoutMs);
    } catch (e: any) {
      raw = { status: 599, json: null, text: String(e?.name || e) };
    }
    // older endpoints may not know responseJsonSchema -> switch to the OpenAPI-style field once
    if (raw.status === 400 && schemaField === "responseJsonSchema" && /responseJsonSchema|response_json_schema/i.test(raw.text)) {
      schemaField = "responseSchema"; continue;
    }
    const transient = raw.status === 429 || raw.status >= 500;
    if (!transient) return { raw, retries };
    if (raw.status === 429 && quotaInfo(raw.json).daily) return { raw, retries };
    const wait = Math.min(raw.status === 429 ? quotaInfo(raw.json).delay || 2000 * 2 ** attempt : 1000 * 2 ** attempt, 20000);
    if (attempt >= Number(process.env.GEMINI_MAX_RETRIES || 4) || Date.now() + wait > deadline) return { raw, retries };
    retries++;
    await sleep(wait + Math.floor(Math.random() * 400));
  }
}

function extractText(j: any): { text: string; finish: string; block?: string } {
  const c = j?.candidates?.[0];
  const text = (c?.content?.parts || []).filter((p: any) => typeof p.text === "string" && !p.thought).map((p: any) => p.text).join("");
  return { text, finish: c?.finishReason || "", block: j?.promptFeedback?.blockReason };
}

/** Structured-JSON generation with model fallback, retry/backoff on 429/5xx and Chinese error messages. */
export async function generateJSON<T = any>(parts: Part[], schema: object, o: GenOpts = {}): Promise<GenResult<T>> {
  if (!aiConfigured()) throw new AIError(501, "ai_not_configured", ZH.none);
  const now = Date.now();
  const chain = modelChain();
  const order = working ? [working, ...chain.filter((m) => m !== working)] : chain;
  let last: AIError | null = null;
  const t0 = Date.now();
  for (const model of order) {
    if ((skip.get(model) || 0) > now) continue;
    const { raw, retries } = await callModel(model, parts, schema, o);
    if (raw.status === 200) {
      const { text, finish, block } = extractText(raw.json);
      if (block || finish === "SAFETY" || finish === "PROHIBITED_CONTENT") throw new AIError(422, "safety", ZH.safety);
      if (finish === "MAX_TOKENS") throw new AIError(413, "too_long", ZH.long);
      let data: T;
      try { data = JSON.parse(text); } catch { throw new AIError(502, "bad_output", ZH.bad); }
      working = model;
      const u = raw.json?.usageMetadata || {};
      console.info(`[reader/ai] ok model=${model} ms=${Date.now() - t0} retries=${retries} in=${u.promptTokenCount ?? "?"} out=${u.candidatesTokenCount ?? "?"}`);
      return { data, model, ms: Date.now() - t0, usage: raw.json?.usageMetadata, retries };
    }
    const msg = String(raw.json?.error?.message || raw.text).slice(0, 300);
    if (raw.status === 404 || (raw.status === 400 && /not found|not supported|unsupported model|is not available|no longer available/i.test(msg))) {
      console.warn(`[reader/ai] fallback: ${model} unavailable (${raw.status})`);
      skip.set(model, now + 3600_000); last = new AIError(503, "model_unavailable", ZH.model, `${model}: ${msg}`); continue;
    }
    if (raw.status === 429) {
      const q = quotaInfo(raw.json);
      if (q.daily) console.warn(`[reader/ai] fallback: ${model} daily quota (${q.ids})`);
      if (q.daily) { skip.set(model, now + 3600_000); last = new AIError(429, "daily_quota", ZH.daily, `${model}: ${q.ids}`); continue; }
      throw new AIError(429, "rate_limited", ZH.busy, `${model}: ${msg}`);
    }
    if (raw.status === 401 || raw.status === 403 || (raw.status === 400 && /API key/i.test(msg))) throw new AIError(502, "bad_key", ZH.key);
    if (raw.status >= 500) throw new AIError(503, "upstream", ZH.down, `${model}: ${raw.status}`);
    throw new AIError(502, "upstream_error", ZH.bad, `${model}: ${raw.status} ${msg}`);
  }
  throw last || new AIError(503, "model_unavailable", ZH.model);
}

/** Upload large media with the Gemini Files API (resumable, 2 requests) and wait until ACTIVE. */
export async function uploadFile(bytes: Uint8Array, mime: string): Promise<{ uri: string; name: string }> {
  const root = base().replace(/\/v1beta$/, "");
  const start = await fetch(`${root}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": key(), "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.length), "X-Goog-Upload-Header-Content-Type": mime, "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "reader-upload" } }),
  });
  const url = start.headers.get("x-goog-upload-url");
  if (!start.ok || !url) throw new AIError(start.status === 429 ? 429 : 503, "upload_failed", start.status === 429 ? ZH.busy : ZH.down);
  const up = await fetch(url, {
    method: "POST",
    headers: { "Content-Length": String(bytes.length), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" },
    body: new Blob([bytes as unknown as ArrayBuffer]),
  });
  const j: any = await up.json().catch(() => ({}));
  let f = j.file;
  if (!up.ok || !f?.uri) throw new AIError(503, "upload_failed", ZH.down);
  for (let i = 0; i < 30 && f.state === "PROCESSING"; i++) {
    await sleep(2000);
    const r = await fetch(`${base()}/${f.name}`, { headers: { "x-goog-api-key": key() }, cache: "no-store" });
    f = await r.json();
  }
  if (f.state === "FAILED") throw new AIError(422, "file_failed", "这个文件 AI 读不了，换个格式（m4a / mp3 / jpg）试试。");
  return { uri: f.uri, name: f.name };
}

export async function deleteFile(name: string) {
  try { await fetch(`${base()}/${name}`, { method: "DELETE", headers: { "x-goog-api-key": key() } }); } catch { /* best effort */ }
}

/** JSON error response for routes. */
export function aiErrorResponse(e: unknown) {
  if (e instanceof AIError) {
    console.warn(`[reader/ai] ${e.code}: ${e.message}`); // message never contains the key
    return Response.json({ error: e.code, detail: e.zh }, { status: e.status, headers: { "Cache-Control": "no-store" } });
  }
  console.error("[reader/ai] unexpected", (e as any)?.message);
  return Response.json({ error: "server_error", detail: "服务器出错了，请稍后再试。" }, { status: 500 });
}
