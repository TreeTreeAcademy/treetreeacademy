// Bundles @vercel/blob/client's upload() for the static reader app -> public/reader/vendor/blob-client.js
// Run after upgrading @vercel/blob:  node scripts/build-reader-blob-client.mjs
import { build } from "esbuild";
await build({
  stdin: { contents: `import { upload } from "@vercel/blob/client"; window.TTBlob = { upload };`, resolveDir: process.cwd() },
  bundle: true, minify: true, format: "iife", platform: "browser", target: "es2020",
  outfile: "public/reader/vendor/blob-client.js", legalComments: "eof",
});
console.log("ok");
