# CI/CD Setup

## Overview

| App | CI | CD |
|-----|----|----|
| `api-server` | GitHub Actions (lint + build) | Railway (auto-deploy on push to main) |
| `store-admin` | GitHub Actions (lint + build) | Cloudflare Pages (auto-deploy on push to main) |
| `store-customer` | GitHub Actions (lint + build) | Cloudflare Pages (auto-deploy on push to main) |

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

### store-admin setup

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Pages → Create a project**
2. Connect GitHub → select `whatsapp-commerce` repo
3. Configure build:
   - **Project name:** `store-admin`
   - **Root directory:** `store-admin`
   - **Build command:** `npm run build`
   - **Output directory:** `.next`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → your Railway backend URL

### store-customer setup

Same steps, different values:
- **Project name:** `store-customer`
- **Root directory:** `store-customer`
- **Build command:** `npm run build`
- **Output directory:** `.next`
- Add same `NEXT_PUBLIC_API_URL` env var

### Custom Domains

For each store's domain (e.g. `freshmart.com`):
1. Cloudflare Pages → your project → **Custom domains**
2. Add the domain and follow DNS instructions

### Auto-deploy

Every push to `main` triggers a new Cloudflare Pages build automatically.
Pull requests get a **preview URL** (e.g. `https://pr-123.store-admin.pages.dev`) — great for testing before merging.

---

## Branch Strategy

```
feature/xxx  →  CI runs (lint + build check)
               ↓ merge to main
main         →  CI runs → Railway deploys backend
                        → Cloudflare Pages deploys store-admin
                        → Cloudflare Pages deploys store-customer
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

Total estimated cost: **~$5-10/month** until significant scale.
