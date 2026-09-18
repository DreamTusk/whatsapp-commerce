# CI/CD Setup

## Overview

| App | CI | CD |
|-----|----|----|
| `api-server` | GitHub Actions (lint + build) | Railway (auto-deploy on push to main) |
| `store-admin` | GitHub Actions (lint + build) | Cloudflare Workers via OpenNext (manual, via `npm run deploy` script — not connected to git) |
| `store-customer` | GitHub Actions (lint + build) | Cloudflare Pages (auto-deploy on push to main) |
| `landing-page` | — | Cloudflare Pages (manual, via `npm run deploy` script — not connected to git) |

---

## CI — GitHub Actions

File: `.github/workflows/ci.yml`

Runs on every push to `main` and every pull request targeting `main`.

**What it does:**
- Installs dependencies (`npm ci`) for all three apps
- Runs `prisma generate` for the backend
- Runs lint check
- Runs production build

If any step fails, the push/PR is marked as failed. Railway and Cloudflare will still deploy (they trigger on git push independently) — so ensure CI passes before merging PRs.

### GitHub Secrets Required

Go to: **GitHub repo → Settings → Secrets and variables → Actions**

| Secret | Value |
|--------|-------|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL (e.g. `https://your-app.railway.app`) |

---

## CD — Railway (Backend)

### First-time setup

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select `whatsapp-commerce` repo
4. Set **Root Directory** to `api-server`
5. Railway auto-detects Node.js and runs `npm run build` + `npm run start:prod`

### Add PostgreSQL

1. In your Railway project, click **+ New → Database → PostgreSQL**
2. Railway injects `DATABASE_URL` automatically into your backend service

### Environment Variables (Railway dashboard)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Auto-injected by Railway Postgres |
| `JWT_SECRET` | Generate a strong random string |
| `WHATSAPP_VERIFY_TOKEN` | From Meta Developer Portal |
| `WHATSAPP_PHONE_NUMBER_ID` | From Meta Developer Portal |
| `WHATSAPP_ACCESS_TOKEN` | From Meta Developer Portal |
| `NODE_ENV` | `production` |

### Run Prisma Migrations

After first deploy, run migrations via Railway shell:
```bash
npx prisma migrate deploy
```

### Auto-deploy

Once connected, every push to `main` triggers a new Railway deployment automatically.

---

## CD — Cloudflare Pages (Frontends)

### store-customer setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages → Create a project**
2. Connect GitHub → select `whatsapp-commerce` repo
3. Configure build:
   - **Project name:** `store-customer`
   - **Root directory:** `store-customer`
   - **Build command:** `npm run build`
   - **Output directory:** `.next`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → your Railway backend URL

### Custom Domains

For each store's domain (e.g. `freshmart.com`):
1. Cloudflare Pages → your project → **Custom domains**
2. Add the domain and follow DNS instructions

### Auto-deploy

Every push to `main` triggers a new Cloudflare Pages build automatically.
Pull requests get a **preview URL** (e.g. `https://pr-123.store-customer.pages.dev`) — great for testing before merging.

---

## CD — Cloudflare Pages (landing-page, script deploy)

`landing-page` is intentionally **not** connected to Cloudflare's git integration. It's a static marketing site (`next.config.ts` sets `output: 'export'`) deployed by running a script by hand, so a push to `main` never triggers a live deploy on its own.

### One-time setup

1. Create a Cloudflare API token: **Cloudflare Dashboard → My Profile → API Tokens → Create Token**, using the "Edit Cloudflare Workers" template (or a custom token with `Account.Cloudflare Pages: Edit`).
2. Find your **Account ID** on the right sidebar of the Cloudflare Dashboard overview page.
3. Export both locally (e.g. in `~/.zshrc`, or a local untracked `.env` you source):
   ```bash
   export CLOUDFLARE_API_TOKEN=xxxx
   export CLOUDFLARE_ACCOUNT_ID=xxxx
   ```
   The first deploy will create the `landing-page` Pages project automatically if it doesn't exist yet.

### Deploying

```bash
cd landing-page
npm run deploy          # builds the static export and runs `wrangler pages deploy`
```

Script: `landing-page/scripts/deploy.sh`. It runs `npm ci`, `npm run build` (static export to `out/`), then `npx wrangler pages deploy out --project-name=landing-page`.

Override the project name or branch label with env vars: `PROJECT_NAME=landing-page BRANCH=main npm run deploy`.

---

## CD — Cloudflare Workers (store-admin, OpenNext script deploy)

`store-admin` uses real server-rendered dynamic routes (`products/[id]/edit`, `orders/[id]`, etc. — see the `ƒ` entries in the build output), so it can't be a Pages static export like `landing-page`. Instead it's built with the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`) and deployed as a Cloudflare **Worker**, which gives it full Next.js SSR without any route restructuring. Like `landing-page`, it's deliberately **not** connected to Cloudflare's git integration — deploys only happen when the script is run by hand.

Requires Next.js `>=16.3.3` (OpenNext's peer dependency range) — `store-admin` was bumped from `16.2.6` to `16.3.5` to satisfy this.

Config: `store-admin/open-next.config.ts` (OpenNext build config) and `store-admin/wrangler.jsonc` (Worker name, `.open-next/worker.js` entrypoint, static assets binding).

### One-time setup

1. Create a Cloudflare API token: **Cloudflare Dashboard → My Profile → API Tokens → Create Token**, using the "Edit Cloudflare Workers" template.
2. Find your **Account ID** on the right sidebar of the Cloudflare Dashboard overview page.
3. Export both locally:
   ```bash
   export CLOUDFLARE_API_TOKEN=xxxx
   export CLOUDFLARE_ACCOUNT_ID=xxxx
   ```
   The first deploy creates the `store-admin` Worker automatically if it doesn't exist yet.

### Deploying

```bash
cd store-admin
npm run deploy           # next build → opennextjs-cloudflare build → opennextjs-cloudflare deploy
```

Script: `store-admin/scripts/deploy.sh`. Set `NEXT_PUBLIC_API_URL` before running so it's baked into the build the same way the CI build does.

To preview the Worker locally before deploying: `npm run preview`.

---

## Branch Strategy

```
feature/xxx  →  CI runs (lint + build check)
               ↓ merge to main
main         →  CI runs → Railway deploys backend
                        → Cloudflare Pages deploys store-customer
                        (store-admin and landing-page deploy manually via their scripts)
```

**Rule:** Never push broken code to `main`. Always work on a feature branch and open a PR. CI must be green before merging.

---

## Adding Tests Later

When you add tests, add this step to each job in `ci.yml`:

```yaml
- name: Test
  run: npm test
```

For the backend (NestJS), the test command is already configured: `npm run test`.

---

## Costs

| Service | Free tier | Paid |
|---------|-----------|------|
| GitHub Actions | 2,000 min/month | $0.008/min after |
| Railway | $5 credit/month | ~$5-10/month for hobby |
| Cloudflare Pages | Unlimited builds | Free |
| Cloudflare Workers (store-admin) | 100,000 requests/day | $5/month (Workers Paid) for higher limits + longer CPU time |

Total estimated cost: **~$5-15/month** until significant scale.
