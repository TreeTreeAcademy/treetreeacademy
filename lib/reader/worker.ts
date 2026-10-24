// Forwards to the parse/enrich worker (reader-worker/worker.py). Config from env only:
//   READER_WORKER_URL   e.g. https://treetree-worker.fly.dev
//   READER_WORKER_TOKEN shared bearer token (same value as WORKER_TOKEN on the worker)
export function workerConfigured() {
  return !!process.env.READER_WORKER_URL;
}
export async function forward(pathname: string, body: BodyInit, contentType?: string | null) {
  const url = process.env.READER_WORKER_URL;
  if (!url) return Response.json({ error: "worker not configured (READER_WORKER_URL)" }, { status: 501 });
  const headers: Record<string, string> = {};
  if (contentType) headers["Content-Type"] = contentType;
  if (process.env.READER_WORKER_TOKEN) headers.Authorization = `Bearer ${process.env.READER_WORKER_TOKEN}`;
  try {
    const r = await fetch(url.replace(/\/$/, "") + pathname, { method: "POST", headers, body, cache: "no-store" });
    return new Response(r.body, { status: r.status, headers: { "Content-Type": r.headers.get("content-type") || "application/json" } });
  } catch (e) {
    return Response.json({ error: "worker unreachable" }, { status: 502 });
  }
}
