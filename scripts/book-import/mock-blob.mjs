// Tiny in-memory stand-in for the Vercel Blob API, for local tests of the private-Blob image path.
//   node scripts/book-import/mock-blob.mjs [port]
//   then run the site with VERCEL_BLOB_API_URL=http://127.0.0.1:<port> BLOB_READ_WRITE_TOKEN=vercel_blob_rw_mockstore_x
import http from "http";
const port = Number(process.argv[2] || 8788), base = `http://127.0.0.1:${port}`;
const files = new Map();
let puts = 0, gets = 0, dels = 0;
http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const u = new URL(req.url, base), body = Buffer.concat(chunks);
    const authed = /^Bearer vercel_blob_rw_/.test(req.headers.authorization || "");
    if (!authed) { res.writeHead(403); return res.end("{}"); }
    if (req.method === "PUT" && u.pathname === "/") {
      const p = u.searchParams.get("pathname"); puts++;
      files.set(p, { body, type: req.headers["x-content-type"] || "application/octet-stream" });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ url: `${base}/${p}`, downloadUrl: `${base}/${p}?download=1`, pathname: p, contentType: req.headers["x-content-type"], contentDisposition: "inline", etag: `"${body.length}"` }));
    }
    if (req.method === "POST" && u.pathname === "/delete") {
      const { urls = [] } = JSON.parse(body.toString() || "{}");
      for (const x of urls) { files.delete(new URL(x).pathname.slice(1)); dels++; }
      res.writeHead(200, { "content-type": "application/json" }); return res.end("{}");
    }
    if (req.method === "GET" && u.pathname === "/_stats") { res.writeHead(200); return res.end(JSON.stringify({ files: files.size, bytes: [...files.values()].reduce((t, f) => t + f.body.length, 0), puts, gets, dels })); }
    if (req.method === "GET") {
      const f = files.get(decodeURIComponent(u.pathname.slice(1))); gets++;
      if (!f) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": f.type, "content-length": f.body.length }); return res.end(f.body);
    }
    res.writeHead(400); res.end("{}");
  });
}).listen(port, "127.0.0.1", () => console.log(`mock blob on ${base}`));
