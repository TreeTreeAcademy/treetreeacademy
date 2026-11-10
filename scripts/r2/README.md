# Private Cloudflare R2 for Tree Tree Reader

Images and TTS clips move here; book/talk/roots JSON stays in Upstash Redis. The app serves every object through its own authenticated routes (or a private/signed path). It never uses a public `*.r2.dev` URL.

The integration is **off** until `READER_R2_ENABLED=1` and the four R2 credentials are set in Vercel. The migration script can be run the moment those values exist: it copies objects first, then (separately) swaps KV payloads for tiny pointers. While both stores exist, reads try R2 and fall back to KV.

## What Sasha does in Cloudflare

Do these in the Cloudflare dashboard. Do **not** add a payment card to Upstash. R2 itself does require a card on file to turn the product on; the free tier is then 10 GB-month of storage, 1 million Class A writes, 10 million Class B reads, and $0 egress.

1. **Create a Cloudflare account** at [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) if you do not already have one (email is enough to start).
2. **Enable R2**: open **R2 Object Storage** in the left sidebar and complete the R2 checkout / “Get started” step so the product is enabled on the account. This is the step that asks for a payment card.
3. **Create a private bucket**
   - Click **Create bucket**.
   - Bucket name (recommended): `treetree-reader`
   - Location: Automatic (or the closest region).
   - Leave **public access off**. Do not connect a custom domain to the bucket for public files, and do not enable the public `r2.dev` subdomain. The app will fetch objects with a private API token.
4. **Create an R2 API token** (this is what the app uses)
   - On the R2 overview, open **Manage R2 API Tokens** → **Create API token**.
   - Token name: `treetree-reader`.
   - Permission: **Object Read & Write** (not “Admin Read & Write”).
   - Apply it to **this bucket only** (`treetree-reader`), not every bucket on the account.
   - Leave the TTL unlimited (or a long expiry you are willing to rotate).
   - After you create it, Cloudflare shows **Access Key ID** and **Secret Access Key** once. Copy both.
5. **Copy the Account ID**: it is on the R2 overview (and in the dashboard URL / the right-hand “Account ID” panel).

## Values to give me (secure form only — never paste them in chat)

| Field | What it is | Example |
| --- | --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare account ID (hex string) | from the dashboard sidebar |
| `R2_BUCKET` | Bucket name | `treetree-reader` |
| `R2_ACCESS_KEY_ID` | Token access key | shown once when the token is created |
| `R2_SECRET_ACCESS_KEY` | Token secret key | shown once when the token is created |

I will put those four values into Vercel (and the box, for the one-time migration) and set `READER_R2_ENABLED=1`. Optional, with working defaults: `R2_ENDPOINT` (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) and `R2_REGION` (`auto`). You do not need to create a public bucket, a custom domain, or an `r2.dev` URL.

## After credentials exist

```bash
# counts only
python3 scripts/r2/migrate.py
# copy objects to R2; leave KV payloads in place (safe, reversible)
python3 scripts/r2/migrate.py --copy
# once a few objects have been verified through the app, replace KV audio/images with pointers
python3 scripts/r2/migrate.py --swap
```

`--swap` is what frees the remaining Upstash space. The box backup at `/workspace/backups/upstash-20261110` is kept as the rollback copy.
