# CI/CD Setup

## Overview

There is no CI pipeline — GitHub Actions was removed (it had been failing on lint for all three apps for weeks and didn't gate any real deploy). Each app deploys independently:

| App | CD |
|-----|----|
| `api-server` | EC2 + Docker/ECR (manual, via `npm run deploy`-style script — not connected to git) |
| `store-admin` | Cloudflare Workers via OpenNext (manual, via `npm run deploy` script — not connected to git) |
| `store-customer` | Cloudflare Pages (auto-deploy on push to main) |
| `landing-page` | Cloudflare Pages (manual, via `npm run deploy` script — not connected to git) |

---

## CD — EC2 / Docker / ECR (api-server)

`api-server` runs as a Docker container on a single EC2 instance (Amazon Linux, user `ec2-user`), pulling images from ECR (`dreambiz-api`). Not connected to any CI/CD trigger — deploys only happen when `deploy.sh` is run by hand.

### One-time setup (already done)

- ECR repository `dreambiz-api` (account `009160063765`, region `ap-south-1`)
- EC2 instance with Docker installed, SSH key authorized (bootstrapped via EC2 Instance Connect — see `api-server/deploy.sh` header comments)
- nginx installed directly on the EC2 host (not containerized), reverse-proxying `api.dreambiz.app` → `127.0.0.1:3010`; config at `api-server/nginx/api.dreambiz.app.conf`, copied manually to `/etc/nginx/conf.d/`
- TLS via `certbot --nginx -d api.dreambiz.app`
- Production secrets live in `api-server/.env.production` locally (gitignored) and get synced to `/home/ec2-user/dreamstore/api-server.env` on the box during deploy

### Deploying

```bash
cd api-server
./deploy.sh
```

Script: `api-server/deploy.sh`. It builds and pushes the image to ECR (via `push-to-ecr.sh`), scp's `.env.production` and `run-on-ec2.sh` to the EC2 box, then SSHes in to run `run-on-ec2.sh` (pulls the image, runs `prisma migrate deploy`, restarts the container).

### Environment Variables (`api-server/.env.production`, gitignored)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon Postgres connection string |
| `JWT_SECRET` / `CUSTOMER_JWT_SECRET` | Strong random strings |
| `ENCRYPTION_KEY` | AES-256-GCM key for encrypting payment provider secrets |
| `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_BUSINESS_ACCOUNT_ID` / `WHATSAPP_ACCESS_TOKEN` | From Meta Developer Portal |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | From Razorpay dashboard |
| `R2_*` | Cloudflare R2 file storage credentials |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | SMTP for transactional email |
| `ADMIN_APP_URL` / `APP_URL` | Production URLs for store-admin / store-customer |

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
   - `NEXT_PUBLIC_API_URL` → `https://api.dreambiz.app`

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

Script: `store-admin/scripts/deploy.sh`. Set `NEXT_PUBLIC_API_URL` before running so it's baked into the build.

To preview the Worker locally before deploying: `npm run preview`.

---

## Branch Strategy

```
feature/xxx  →  merge to main
main         →  Cloudflare Pages auto-deploys store-customer
                 (api-server, store-admin, landing-page deploy manually via their own scripts)
```

**Rule:** run `npm run build` (and ideally `npm run lint`) locally before merging to `main` — there's no CI to catch broken builds automatically anymore.

---

## Costs

| Service | Free tier | Paid |
|---------|-----------|------|
| EC2 (api-server) | — | Per your instance type/hours |
| Cloudflare Pages | Unlimited builds | Free |
| Cloudflare Workers (store-admin, store-customer) | 100,000 requests/day | $5/month (Workers Paid) for higher limits + longer CPU time |

Total estimated cost: **~$5-15/month** until significant scale.
