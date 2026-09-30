# Custom Domains for Stores

## Goal

Today every store gets a subdomain of the platform (`<slug>.dreambiz.app`), assigned at creation time in `store-admin/app/create-store/page.tsx`. This feature lets a store owner additionally connect their **own domain** (e.g. `bakehouse.com`) so their storefront (`store-customer`) resolves under it instead of, or alongside, the subdomain.

`store-customer/middleware.ts` already resolves the tenant purely from the request `Host` header (forwarded as `x-store-domain`), and the backend already looks stores up by `Store.domain` (`String? @unique`, `api-server/prisma/schema.prisma:366`). No app-level routing logic needs to change — this is a backend + store-admin feature, plus Cloudflare configuration.

---

## How subdomains are routed today, and why this isn't a Pages/Workers custom-domain feature

`store-customer` is deployed as a **Cloudflare Worker** via the OpenNext adapter (`store-customer/wrangler.jsonc`, `"main": ".open-next/worker.js"` — same setup as `store-admin`, needed for full Next.js SSR since every request resolves a different tenant by domain). `*.dreambiz.app` subdomains are routed to it via a **Cloudflare Worker Route** already configured on the zone — not via Cloudflare Pages, and not via individually-registered Workers Custom Domains. (`ci-cd-setup.md` currently still describes `store-customer` as a Cloudflare Pages project — that's stale and should be corrected separately.)

Two mechanisms were considered and ruled out for external domains:

- **Cloudflare Pages Custom Domains** — not applicable at all; `store-customer` isn't a Pages project.
- **Cloudflare Workers Custom Domains** — requires the domain to be **a zone you already own** in your Cloudflare account for *any* hostname, even a subdomain (`"you cannot create a Custom Domain on... a zone you do not own"`). A store owner's external domain won't become your zone without them handing over their nameservers — too high a friction/trust ask to require of every store owner.

## The actual solution: Cloudflare for SaaS (Custom Hostnames)

This is the product Cloudflare built specifically for this scenario, and it's the same mechanism used under the hood by most multi-tenant SaaS platforms that let customers bring their own domain (Vercel, Netlify, Shopify, Webflow, etc. all do some version of this). It lets a store owner's domain **stay on their own DNS provider** — they add one CNAME (plus a verification record), and Cloudflare terminates SSL and routes matching traffic to a **Fallback Origin** you control, which forwards to the `store-customer` Worker. No zone transfer required.

### One-time zone setup (dashboard, not code)

1. Cloudflare Dashboard → the `dreambiz.app` zone → **SSL/TLS → Custom Hostnames** → **Enable** (requires a payment method on file even for the free tier — this is a non-Enterprise self-serve feature, not something available by default).
2. Configure a **Fallback Origin** on that zone — a hostname (e.g. `fallback.dreambiz.app`) that's itself routed to the `store-customer` Worker. Every verified custom hostname's traffic gets proxied here.

### Limits & pricing

100 custom hostnames included per zone (Free/Pro/Business plans), then **$0.10 per additional hostname** — comfortable headroom, track usage but no near-term concern.

---

## Decisions to confirm before implementing

1. **Fallback**: once a store's custom domain goes live, does `newstore.dreambiz.app` keep working (redirect or dual-serve), or does it stop resolving? Recommendation: keep both working — cheap to support since it's just two rows resolving to the same store, and avoids breaking bookmarks/links shared before the custom domain was connected.
2. **Apex vs. `www`**: unlike a plain CNAME setup, Cloudflare for SaaS supports **Apex Proxying**, so bare apex domains (`bakehouse.com`, no `www`) can work without the owner transferring nameservers. Decide whether to support both apex and `www`, or simplify to one for a smaller support surface — this is no longer forced by a technical limitation, it's purely a product/support-burden choice.

---

## Schema changes (`api-server/prisma/schema.prisma`)

Add fields to the `Store` model (around line 366) to track the custom domain separately from the working platform domain, so a pending/failed verification never breaks the store's existing subdomain:

```prisma
model Store {
  // ...existing fields
  domain               String?  @unique  // stays the platform subdomain, e.g. newstore.dreambiz.app
  customDomain         String?  @unique  // e.g. "bakehouse.com", null until requested
  customDomainStatus   String?           // "pending" | "active" | "failed" | null
  cloudflareHostnameId String?           // Cloudflare's custom hostname id — needed to poll/delete it
}
```

Run `npx prisma migrate dev --name add-store-custom-domain` after editing.

---

## Backend (`api-server`)

### 1. Environment variables — production only

Add to `api-server/.env.production` (not `.env.example` defaults — these must never be callable outside prod):

```
CLOUDFLARE_API_TOKEN=...   # Zone-level token, scoped to "SSL and Certificates: Edit" on the dreambiz.app zone only
CLOUDFLARE_ZONE_ID=...     # the dreambiz.app zone's id (not an account id)
```

This is a distinct credential from the `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` pair in each frontend app's `.env.deploy` (Account-level, used by `wrangler`/OpenNext to deploy the apps themselves) — different scope, different purpose, don't conflate the two.

### 2. Gate the feature to production

Every endpoint that touches the Cloudflare API must no-op (return 403/"not available") outside production:

```ts
if (process.env.NODE_ENV !== 'production') {
  throw new ForbiddenException('Custom domains can only be managed in production');
}
```

This isn't just a UI hide — every store on staging/dev/local pointed at the same zone would otherwise burn through the same hostname quota during testing. For local testing of the flow itself, mock the Cloudflare client rather than hitting the real API.

### 3. Cloudflare client wrapper

New file, e.g. `api-server/src/shared/cloudflare.client.ts`, wrapping the Custom Hostnames API (zone-scoped, not account-scoped):

- `addDomain(hostname: string)` → `POST /zones/{zone_id}/custom_hostnames`, body `{ hostname, ssl: { method: "http", type: "dv", bundle_method: "ubiquitous" } }` — returns Cloudflare's hostname id, `ownership_verification` (a TXT record to prove control), and `ssl.validation_records` (CNAME/TXT needed for the SSL cert to issue). Also tell the store owner to CNAME their domain at your fallback-origin hostname — that's what actually routes their traffic, separate from the verification records Cloudflare returns.
- `getDomainStatus(hostname: string)` → `GET /zones/{zone_id}/custom_hostnames/{id}` — poll `status`/`ssl.status` until `active`.
- `removeDomain(hostname: string)` → `DELETE /zones/{zone_id}/custom_hostnames/{id}`.

### 4. New endpoints (`api-server/src/admin/store/store.controller.ts`)

Mirror the existing `PUT /api/store` (OWNER-only) pattern:

- `POST /api/store/custom-domain` — body `{ domain }`. Validates format, checks uniqueness (same pattern as `createStore`'s domain check), calls `cloudflare.addDomain()`, stores `customDomain` + `cloudflareHostnameId` + `customDomainStatus: 'pending'`, returns the CNAME target + verification records for store-admin to display.
- `GET /api/store/custom-domain/status` — calls `cloudflare.getDomainStatus()`, updates `customDomainStatus`. When it flips to `active`, this is also where you decide (per the fallback decision above) whether to also start resolving `domain` lookups against `customDomain`.
- `DELETE /api/store/custom-domain` — calls `cloudflare.removeDomain()`, clears the three fields.

Reuse `assertDomainNotReserved`-style validation, but note it currently only matches `*.dreambiz.app` patterns (`store.service.ts:120`) — external domains skip that check entirely, they just need a basic hostname format + uniqueness check.

### 5. Resolution

If you keep both domains live (decision #1), `getStoreInfo(domain)` (`store.service.ts:126`) needs to look up by `domain` **or** `customDomain`:

```ts
const store = await this.prisma.store.findFirst({
  where: { OR: [{ domain }, { customDomain: domain }] },
  include: { StoreCustomization: true },
});
```

### 6. Letting `store-customer` tell the two apart

Resolving either domain to the right store isn't the whole picture — `store-customer` may need to behave *differently* depending on which one was used, e.g.:

- Hiding a "Powered by [platform]" badge once a store is on its own custom domain (a common white-label expectation store owners will ask for).
- Setting the canonical URL / `<link rel="canonical">` to the custom domain once active, so search engines don't treat the subdomain and custom domain as duplicate content.
- Deciding whether to redirect visitors on the old subdomain to the custom domain (SEO-preferred) vs. silently serving both (per the fallback decision above) — a "you can now find us at bakehouse.com" banner is a middle ground.

The cheapest way to tell them apart is at the edge, in `store-customer/middleware.ts`, **without a DB round trip**: compare the incoming `Host` against the known platform base domain (the same `NEXT_PUBLIC_STORE_DOMAIN`/`dreambiz.app` value already used to build subdomains in `create-store/page.tsx`):

```ts
const BASE_DOMAIN = process.env.NEXT_PUBLIC_STORE_DOMAIN || 'dreambiz.app'
const domain = host.split(':')[0]
const domainType = domain.endsWith(`.${BASE_DOMAIN}`) ? 'platform' : 'custom'

requestHeaders.set('x-store-domain', domain)
requestHeaders.set('x-domain-type', domainType)
```

Pages/Server Components can then read `x-domain-type` (via `headers()`) to branch on branding/canonical logic without any backend change. This only tells you *how the visitor got here* — it's a static suffix check, not a lookup — so it works even before a custom domain has finished DNS verification.

One related gotcha worth flagging to whoever builds cart/session handling: cookies set by `store-customer` (customer session, cart) are scoped to the exact host that set them by default. A returning customer who bookmarked the old subdomain won't share a cart/session with the same store on its new custom domain — they're different origins as far as the browser is concerned. This reinforces keeping the subdomain resolvable (decision #1) rather than cutting it over abruptly.

---

## Frontend (`store-admin`)

### Replace the stub panel

`store-admin/app/dashboard/settings/panels/domain.tsx` currently just shows the existing domain read-only with a "not supported yet" message — this is where the new flow goes.

Follow the structure already used in `store-admin/app/dashboard/settings/panels/payments.tsx` (fetch config on mount → `isConfigured` boolean gates an empty state vs. a connected view → dialog-based add flow → per-action loading flags):

1. **Empty state**: "Connect your own domain" button → opens a dialog with a single domain input.
2. **Submit** → `POST /api/store/custom-domain` → show the CNAME target (their domain → your fallback-origin hostname) plus any verification record, with a copy button (reuse `store-admin/components/storefront-link.tsx`'s copy pattern).
3. **Pending state**: poll `GET /api/store/custom-domain/status` (e.g. every 10–15s) until `active` or `failed`. The step-by-step layout in `store-admin/app/(auth)/verify-email/page.tsx` (status text + spinner + a manual "check again" action) is a good template for this waiting screen.
4. **Active state**: show the connected domain (green/confirmed), with a "Remove" action calling the `DELETE` endpoint.
5. **Failed state**: show the error, let them re-check DNS or start over.

### Gate in the UI too

Hide/disable the "Connect domain" action when the app isn't running against production (mirrors the backend gate) so nobody on staging tries it and hits the 403.

---

## Rollout checklist

- [ ] Enable SSL for SaaS on the `dreambiz.app` zone (dashboard, one-time, requires billing details) + configure a Fallback Origin pointed at the `store-customer` Worker
- [ ] Migration: `customDomain`, `customDomainStatus`, `cloudflareHostnameId` on `Store`
- [ ] `CLOUDFLARE_API_TOKEN` (Zone → SSL and Certificates: Edit) / `CLOUDFLARE_ZONE_ID` in `api-server/.env.production` only
- [ ] Cloudflare client wrapper (zone-scoped Custom Hostnames API) + production-only guard on every endpoint that calls it
- [ ] `POST` / `GET status` / `DELETE` endpoints on `store.controller.ts`
- [ ] Decide + implement fallback behavior (dual-resolve vs. replace)
- [ ] Decide apex-vs-`www` handling (both are now supportable via Apex Proxying) and document it for store owners
- [ ] Rebuild `domain.tsx` panel (connect → DNS instructions → poll → active/failed states)
- [ ] Track custom-hostname count; alert before nearing 100 free-tier hostnames (then $0.10/hostname after)
- [ ] Fix `ci-cd-setup.md`'s stale claim that `store-customer` is a Cloudflare Pages project
