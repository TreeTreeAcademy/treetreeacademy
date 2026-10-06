# 树儿学院

Mobile-first static site for **treetreeacademy.com** — 小群姐姐 · 听故事复述 weekday briefings.

Stack: **Next.js (App Router) + TypeScript + plain CSS**. Content lives as JSON under `content/xiaoqun/`.

## Local development

```bash
cd treetreeacademy
npm i
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script        | What it does              |
|---------------|---------------------------|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build        |
| `npm start`   | Serve the production build |

## Routes

| Path | Page |
|------|------|
| `/` | Home — intro + latest episode |
| `/xiaoqun` | Episode index (newest first) |
| `/xiaoqun/[slug]` | Episode detail (4 sections) |

Episode 1: `/xiaoqun/2026-10-06-ep1`

## Adding a new weekday episode

See [`content/xiaoqun/README.md`](content/xiaoqun/README.md). Drop a new `.json` file; the index and static paths pick it up automatically on the next build.

## Deploy to Vercel

1. Push this repo to GitHub (or import the folder via Vercel dashboard).
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework Preset: **Next.js** (auto-detected). Leave Build Command `next build`, Output default.
4. Click **Deploy**. You get a `*.vercel.app` URL immediately.

No Vercel CLI login is required for the dashboard flow.

## Bind treetreeacademy.com DNS

Do this **after** the first Vercel deploy succeeds.

1. In Vercel → Project → **Settings → Domains** → add `treetreeacademy.com` (and optionally `www.treetreeacademy.com`).
2. Vercel will show the exact records. Typical options:

   **Option A — Nameservers (simplest if domain is free)**  
   At Namecheap (or your registrar): remove URL Forward / Parking.  
   Set custom nameservers to the two Vercel nameservers shown in the Domains UI.

   **Option B — A / CNAME records**  
   - Apex `treetreeacademy.com` → A record to the IP Vercel shows (often `76.76.21.21`).  
   - `www` → CNAME to `cname.vercel-dns.com` (or the host Vercel shows).

3. At Namecheap: Domain List → Manage → **remove** any URL Redirect / Parking page / “Domain Forwarding” that points elsewhere, otherwise it fights the Vercel records.
4. Wait for DNS propagation (minutes to a few hours). Vercel Domains UI will flip to **Valid**.

Membership / auth is **not** built yet — add later when ready.

## Branding notes

- Display name: **树儿学院** (Chinese primary). Color circular tree logo in `public/logo.png`.
- Palette from logo: gold `#fdd100`, lime `#aae013`, mid green `#53bd25`, forest `#00964f`.
- Footer links **Tree Tree Lab** shop via `public/tree-tree-lab.png` (B&W stamp) — separate from the academy mark.
- Large Chinese body text (~18px), line-height ~1.85, max-width ~40rem.
- Footer attributes 小群姐姐讲故事公众号 + 愿闻表达训练思路.
