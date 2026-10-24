// Tiny fake Gemini generateContent endpoint for dry runs of the importer (no quota used, no book content).
//   node scripts/book-import/mock-gemini.mjs [port]   then   GEMINI_BASE_URL=http://127.0.0.1:<port>/v1beta
//   MOCK_429_EVERY=N  -> every Nth call returns a per-minute 429 (tests backoff)
//   MOCK_DELAY_MS=ms  -> simulated latency
//   MOCK_QUOTA_AFTER=N -> after N successful calls every call returns a per-day 429 (tests clean stop + resume)
import http from "http";
const port = Number(process.argv[2] || 8787);
let n = 0;
const every = Number(process.env.MOCK_429_EVERY || 0), delay = Number(process.env.MOCK_DELAY_MS || 300), quotaAfter = Number(process.env.MOCK_QUOTA_AFTER || 0);
const ok = (res, obj) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 1300, candidatesTokenCount: 900 } })); };
http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => setTimeout(() => {
    n++;
    if (quotaAfter && n > quotaAfter) {
      res.writeHead(429, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { code: 429, message: "mock daily limit", details: [{ "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } }));
    }
    if (every && n % every === 0) {
      res.writeHead(429, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { code: 429, message: "mock per-minute limit", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "1s" }, { "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel" }] }] } }));
    }
    const j = JSON.parse(body || "{}");
    const parts = j.contents?.[0]?.parts || [];
    const text = parts.map((p) => p.text || "").join("\n");
    if (parts.some((p) => p.inline_data || p.file_data)) {
      const k = n;
      return ok(res, { has_english: true, title: "", paragraphs: [{ sentences: [{ en: `Mock page ${k} tells a short story.`, zh: `模拟第 ${k} 页讲了一个小故事。` }, { en: "The brain helps us learn new words.", zh: "大脑帮助我们学习新单词。" }] }],
        glossary: [{ form: "mock", lemma: "mock", zh: "adj. 模拟的" }, { form: "brain", lemma: "brain", zh: "n. 大脑" }] });
    }
    const m = text.match(/\[[\s\S]*\]\s*$/);
    const arr = m ? JSON.parse(m[0]) : [];
    return ok(res, { translations: arr.map((s, i) => `（模拟译文 ${i + 1}）`), glossary: [] });
  }, delay));
}).listen(port, "127.0.0.1", () => console.log(`mock gemini on ${port}`));
