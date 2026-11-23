# ភូមិខ្ញុំ (Phum Khnhom) — Production Launch & Deployment Guide

Target Production Domain: **`https://www.bluexacedamy.space`**

## Architecture Overview

| Layer | Hosting Provider | Directory | Protocol / Port |
| :--- | :--- | :--- | :--- |
| **Database** | Supabase (PostgreSQL) | `server/src/db/schema.sql` | HTTPS REST / SQL |
| **Game Server** | Railway / Fly.io (Node 20 Docker) | `/server` | HTTPS + WSS (`$PORT`) |
| **Web Client (PWA)** | Vercel (Static Vite SPA) | `/client` | HTTPS (`www.bluexacedamy.space`) |

---

## Step 1 — Provision Supabase PostgreSQL

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New Query**, paste the full contents of `server/src/db/schema.sql`, and click **Run**.
3. Copy your credentials from **Project Settings → API**:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (Service Role Secret — **backend only, never expose to client**)

---

## Step 2 — Deploy Multiplayer Server (`/server`) to Railway

1. Connect this Git repository in [railway.app](https://railway.app) → **New Project → Deploy from GitHub**.
2. Set **Root Directory** to `server`. Railway automatically detects `server/railway.json` and `server/Dockerfile`.
3. Configure **Variables** in Railway:

| Variable | Required | Example Value |
| :--- | :---: | :--- |
| `NODE_ENV` | Yes | `production` *(auto-disables `/api/payments/sandbox-topup`)* |
| `HOST` | Yes | `0.0.0.0` |
| `PORT` | Auto | Railway injects `$PORT` automatically (fallback `2567`) |
| `CLIENT_ORIGIN` | Yes | `https://www.bluexacedamy.space,https://bluexacedamy.space` |
| `SUPABASE_URL` | Yes | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJhbGciOi...` |
| `AUTH_SECRET` | Yes | Generate a 64-char random hex secret |
| `STRIPE_WEBHOOK_SECRET` | Optional | `whsec_...` (Stripe Webhook Signing Secret) |
| `ABA_PAYWAY_MERCHANT_ID` | Optional | Your ABA PayWay Merchant ID |
| `ABA_PAYWAY_API_KEY` | Optional | Your ABA PayWay Public/Webhook HMAC Key |

4. Generate a public Railway domain (e.g. `https://phum-khnhom-server.up.railway.app`) and verify:
   ```bash
   curl https://phum-khnhom-server.up.railway.app/health
   # Expected: {"status":"ok","uptime":...}
   ```

---

## Step 3 — Deploy Web Client (`/client`) to Vercel (`www.bluexacedamy.space`)

1. Import this Git repository in [vercel.com](https://vercel.com) → **Add New Project**.
2. Set **Root Directory** to `client` (uses `client/vercel.json` for SPA rewrites & immutable asset caching).
3. Add **Environment Variables** in Vercel:

| Variable | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://phum-khnhom-server.up.railway.app` |
| `VITE_WS_URL` | `wss://phum-khnhom-server.up.railway.app` |

4. Attach Custom Domain **`www.bluexacedamy.space`** (and apex redirect `bluexacedamy.space` → `www.bluexacedamy.space`):
   - `CNAME` record for `www` → `cname.vercel-dns.com`
   - `A` record for `@` → `76.76.21.21`
5. Trigger a production deploy and verify:
   - Refreshing any URL path loads cleanly without 404.
   - Top-center HUD pill shows **Online • 1 player** on `AREA 0` over `wss://`.
   - On Android Chrome / iOS Safari, tap **Add to Home Screen** to launch full-screen as a mobile PWA.

---

## Step 4 — Wire Live Payment Webhooks (Stripe & ABA PayWay KHQR)

- **Stripe Dashboard → Developers → Webhooks:**
  - Endpoint URL: `https://<your-railway-domain>/api/payments/stripe-webhook`
  - Events: `checkout.session.completed`, `payment_intent.succeeded`
  - Pass `metadata: { playerId, sku }` (`pack_100`, `pack_500`, `pack_1200`, or `monthly_village_pass`).
- **ABA PayWay Merchant Portal (Cambodia KHQR):**
  - Callback URL: `https://<your-railway-domain>/api/payments/aba-payway-webhook`
  - Verifies HMAC-SHA512 signature using `ABA_PAYWAY_API_KEY` before crediting Diamonds & activating the 30-day Monthly Village Pass.
