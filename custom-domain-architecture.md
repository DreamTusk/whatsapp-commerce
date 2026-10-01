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

> **This entire flow has been manually verified end-to-end** against a real external domain (`dreamkids.in`, via `www.dreamkids.in`) — real DNS records, real SSL issuance, real routing all the way into `store-customer`. The steps below are the exact steps that worked, not a theoretical plan.

### One-time zone setup (dashboard, not code)

1. Cloudflare Dashboard → the `dreambiz.app` zone → **SSL/TLS → Custom Hostnames** → **Enable** (requires a payment method on file even for the free tier — this is a non-Enterprise self-serve feature, not something available by default).
2. Add an **originless DNS record** to act as the Fallback Origin — this is the part that's easy to get wrong:
   ```
   Type:    AAAA
   Name:    storefront        (→ storefront.dreambiz.app)
   Content: 100::              (the IPv6 discard prefix — a deliberate non-routable placeholder)
   Proxy:   Proxied (orange cloud)
   ```
   A plain `A` record to a placeholder IPv4 (e.g. `192.0.2.1`) looks like it should work but **doesn't** — it causes a `522 Connection timed out` once real traffic hits it, because Cloudflare's fallback-origin pipeline will actually attempt a TCP connection to whatever IP that record resolves to. The `AAAA 100::` form is what Cloudflare's own docs specify as the "originless" marker for a Worker-backed fallback origin.
3. Back on **SSL/TLS → Custom Hostnames**, set **Fallback Origin** to `storefront.dreambiz.app`.
4. **Add a second Worker Route** — this is the step most likely to be missed, and the other cause of a `522`. Go to **Workers & Pages → `store-customer` → Settings → Domains & Routes** (or the zone's own Workers Routes page) and add:
   ```
   Route: */*
   Zone:  dreambiz.app
   ```
   Why a *second* route is needed even though `*.dreambiz.app/*` already exists: a custom hostname's traffic keeps the **original Host header** the whole way through (e.g. `www.dreamkids.in`), not `storefront.dreambiz.app`. A route scoped to `*.dreambiz.app/*` only matches requests whose Host is literally a subdomain of `dreambiz.app`, so it never matches external custom-hostname traffic at all. The `*/*` pattern is Cloudflare's documented catch-all specifically for this case — it matches every hostname entering the zone, including completely unrelated external domains. Both routes stay bound to the same `store-customer` Worker; the existing `*.dreambiz.app/*` route doesn't need to be removed.

### Limits & pricing

100 custom hostnames included per zone (Free/Pro/Business plans), then **$0.10 per additional hostname** — comfortable headroom, track usage but no near-term concern.

---

## Decisions to confirm before implementing

1. **Fallback**: once a store's custom domain goes live, does `newstore.dreambiz.app` keep working (redirect or dual-serve), or does it stop resolving? Recommendation: keep both working — cheap to support since it's just two rows resolving to the same store, and avoids breaking bookmarks/links shared before the custom domain was connected.
2. **What to ask the store owner to point, resolved**: don't default to `www.<domain>` — plenty of real businesses already have a live site at `www` (their marketing site), and reusing it would overwrite that. Ask for a **dedicated subdomain** instead (e.g. `shop.bakehouse.com` or `store.bakehouse.com`), which is also what most real commerce platforms do in practice. For the bare apex (`bakehouse.com` with no subdomain) — Cloudflare's Apex Proxying can technically support it, but only if the owner's DNS provider supports ALIAS/ANAME records at the apex (many consumer registrars don't) or they're willing to move nameservers to Cloudflare (high friction, avoid requiring it). The practical answer: don't promise apex support. Instead, tell the store owner to set up **domain forwarding** at their registrar (a feature nearly every registrar offers, separate from DNS records) from the bare apex to their chosen subdomain — gives the appearance of "it just works at the root" with zero Cloudflare-side apex complexity.

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

- `addDomain(hostname: string)` → `POST /zones/{zone_id}/custom_hostnames`, body `{ hostname, ssl: { method: "http", type: "dv", bundle_method: "ubiquitous" } }` — returns Cloudflare's hostname id, `ownership_verification` (a TXT record to prove control), and `ssl.validation_records`/`ssl.status` (tracks SSL cert issuance, which Cloudflare completes automatically once the CNAME is live — no action needed beyond the TXT record). Also tell the store owner to CNAME their chosen subdomain at `storefront.dreambiz.app` — that's what actually routes their traffic, separate from the verification records Cloudflare returns.
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

1. **Empty state**: "Connect your own domain" button → opens a dialog asking for a **subdomain** (e.g. `shop.bakehouse.com`), not a bare domain — see the resolved decision above on why `www`/apex aren't the default ask.
2. **Submit** → `POST /api/store/custom-domain` → show the CNAME target (`storefront.dreambiz.app`) plus the TXT verification record, with a copy button (reuse `store-admin/components/storefront-link.tsx`'s copy pattern). Also mention the registrar-forwarding option for the bare apex.
3. **Pending state**: poll `GET /api/store/custom-domain/status` (e.g. every 10–15s) until `active` or `failed`. The step-by-step layout in `store-admin/app/(auth)/verify-email/page.tsx` (status text + spinner + a manual "check again" action) is a good template for this waiting screen.
4. **Active state**: show the connected domain (green/confirmed), with a "Remove" action calling the `DELETE` endpoint.
5. **Failed state**: show the error, let them re-check DNS or start over.

### Gate in the UI too

Hide/disable the "Connect domain" action when the app isn't running against production (mirrors the backend gate) so nobody on staging tries it and hits the 403.

---

## Rollout checklist

- [x] Enable SSL for SaaS on the `dreambiz.app` zone (dashboard, one-time, requires billing details) — **done, verified**
- [x] Add the `storefront.dreambiz.app` originless `AAAA 100::` record (proxied) + set it as Fallback Origin — **done, verified**
- [x] Add the second `*/*` Worker Route (alongside the existing `*.dreambiz.app/*`) on the `dreambiz.app` zone → `store-customer` — **done, verified**
- [x] End-to-end manual test against a real external domain (`www.dreamkids.in`) — CNAME, TXT ownership verification, SSL issuance, routing into `store-customer` all confirmed working
- [ ] Migration: `customDomain`, `customDomainStatus`, `cloudflareHostnameId` on `Store`
- [ ] `CLOUDFLARE_API_TOKEN` (Zone → SSL and Certificates: Edit) / `CLOUDFLARE_ZONE_ID` in `api-server/.env.production` only
- [ ] Cloudflare client wrapper (zone-scoped Custom Hostnames API) + production-only guard on every endpoint that calls it
- [ ] `POST` / `GET status` / `DELETE` endpoints on `store.controller.ts`
- [ ] Decide + implement fallback behavior (dual-resolve vs. replace)
- [ ] `store-customer/middleware.ts`: add `x-domain-type` header (platform vs. custom)
- [ ] `store-customer`: add `alternates.canonical`/`metadataBase` to `app/layout.tsx` + `app/(main)/layout.tsx` (currently has no canonical/OG metadata at all — greenfield addition)
- [ ] Rebuild `domain.tsx` panel (ask for a dedicated subdomain → show CNAME + TXT instructions → poll → active/failed states)
- [ ] Track custom-hostname count; alert before nearing 100 free-tier hostnames (then $0.10/hostname after)
- [ ] Fix `ci-cd-setup.md`'s stale claim that `store-customer` is a Cloudflare Pages project
