# Custom Domains for Stores

## Goal

Today every store gets a subdomain of the platform (`<slug>.dreambiz.app`), assigned at creation time in `store-admin/app/create-store/page.tsx`. This feature lets a store owner additionally connect their **own domain** (e.g. `bakehouse.com`) so their storefront (`store-customer`) resolves under it instead of the subdomain.

No changes are needed in `store-customer` itself — `store-customer/middleware.ts` already resolves the tenant purely from the request `Host` header (forwarded as `x-store-domain`), and the backend already looks stores up by `Store.domain` (`String? @unique`, `api-server/prisma/schema.prisma:366`). This is entirely a backend + store-admin feature, plus one manual Cloudflare step per domain.

---

## How subdomains are actually routed today (read this first)

`store-customer` is deployed on Cloudflare Pages (`ci-cd-setup.md`), but `*.dreambiz.app` subdomains are **not** registered individually as Cloudflare Pages custom domains — Cloudflare Pages doesn't support wildcard custom domains at all. Instead, wildcard routing for `*.dreambiz.app` is handled by a **Cloudflare Worker Route** already set up on the zone. That means:

- Creating a new store on the platform subdomain (`newstore.dreambiz.app`) needs **no Cloudflare changes** — it's already covered by the wildcard route. This keeps working exactly as-is.
- A store owner's **own external domain** (`bakehouse.com`) is not a subdomain of a zone you control, so it can't be covered by that wildcard route. Each one has to be registered individually as a Cloudflare Pages custom domain via the API (see below).

Do not confuse the two mechanisms — this feature only adds the second one.

## Cloudflare Pages custom domain limits (only applies to external domains)

Custom domains are capped per Pages project, by the plan on the domain's zone:

| Plan | Custom domains / project | Price |
|------|--------------------------|-------|
| Free | 100 | $0 |
| Pro | 250 | ~$20/mo (annual) or $25/mo (monthly) |
| Business | 500 | higher |

This cap only counts stores that connect an **external** domain — it has no effect on subdomain-based stores (see above). Track how many stores have an active custom domain and upgrade the `dreambiz.app` zone to Pro well before hitting 100.

---

## Decisions to confirm before implementing

1. **Fallback**: once a store's custom domain goes live, does `newstore.dreambiz.app` keep working (redirect or dual-serve), or does it stop resolving? Recommendation: keep both working — cheap to support since it's just two rows resolving to the same store, and avoids breaking bookmarks/links shared before the custom domain was connected.
2. **Apex vs. `www`**: `bakehouse.com` (apex/bare) can only be a plain CNAME if the owner's DNS is on Cloudflare (CNAME flattening). If their DNS is elsewhere (GoDaddy, Namecheap, etc.), the bare apex may not support a CNAME at all. Decide whether to require `www.bakehouse.com` (always safe) and redirect the apex, or support both with a documented caveat.

---

## Schema changes (`api-server/prisma/schema.prisma`)

Add fields to the `Store` model (around line 366) to track the custom domain separately from the working platform domain, so a pending/failed verification never breaks the store's existing subdomain:

```prisma
model Store {
  // ...existing fields
  domain              String?  @unique   // stays the platform subdomain, e.g. newstore.dreambiz.app
  customDomain         String?  @unique  // e.g. "bakehouse.com", null until requested
  customDomainStatus   String?           // "pending" | "active" | "failed" | null
  cloudflareHostnameId String?           // id Cloudflare returns for the Pages Domain — needed to poll/delete it
}
```

Run `npx prisma migrate dev --name add-store-custom-domain` after editing.

---

## Backend (`api-server`)

### 1. Environment variables — production only

Add to `api-server/.env.production` (not `.env.example` defaults — these must never be callable outside prod):

```
CLOUDFLARE_API_TOKEN=...   # scoped to Cloudflare Pages: Edit
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_PAGES_PROJECT=store-customer
```

### 2. Gate the feature to production

Every endpoint that touches the Cloudflare API must no-op (return 403/"not available") outside production:

```ts
if (process.env.NODE_ENV !== 'production') {
  throw new ForbiddenException('Custom domains can only be managed in production');
}
```

This isn't just a UI hide — every store on staging/dev/local pointed at a shared Cloudflare account would otherwise burn through the same 100-domain cap during testing. For local testing of the flow itself, mock the Cloudflare client rather than hitting the real API.

### 3. Cloudflare client wrapper

New file, e.g. `api-server/src/shared/cloudflare.client.ts`, wrapping the Pages Domains API:

- `addDomain(hostname: string)` → `POST /accounts/{account_id}/pages/projects/{project}/domains` — returns Cloudflare's hostname id + the DNS record (CNAME target) to show the owner.
- `getDomainStatus(hostname: string)` → `GET /accounts/{account_id}/pages/projects/{project}/domains/{domain_name}` — returns verification/SSL status.
- `removeDomain(hostname: string)` → `DELETE .../domains/{domain_name}`.

### 4. New endpoints (`api-server/src/admin/store/store.controller.ts`)

Mirror the existing `PUT /api/store` (OWNER-only) pattern:

- `POST /api/store/custom-domain` — body `{ domain }`. Validates format, checks uniqueness (same pattern as `createStore`'s domain check), calls `cloudflare.addDomain()`, stores `customDomain` + `cloudflareHostnameId` + `customDomainStatus: 'pending'`, returns the DNS record for store-admin to display.
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
2. **Submit** → `POST /api/store/custom-domain` → show the returned CNAME record (host + target) with a copy button (reuse `store-admin/components/storefront-link.tsx`'s copy pattern).
3. **Pending state**: poll `GET /api/store/custom-domain/status` (e.g. every 10–15s) until `active` or `failed`. The step-by-step layout in `store-admin/app/(auth)/verify-email/page.tsx` (status text + spinner + a manual "check again" action) is a good template for this waiting screen.
4. **Active state**: show the connected domain (green/confirmed), with a "Remove" action calling the `DELETE` endpoint.
5. **Failed state**: show the error, let them re-check DNS or start over.

### Gate in the UI too

Hide/disable the "Connect domain" action when the app isn't running against production (mirrors the backend gate) so nobody on staging tries it and hits the 403.

---

## Rollout checklist

- [ ] Migration: `customDomain`, `customDomainStatus`, `cloudflareHostnameId` on `Store`
- [ ] `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_PAGES_PROJECT` in `api-server/.env.production` only
- [ ] Cloudflare client wrapper + production-only guard on every endpoint that calls it
- [ ] `POST` / `GET status` / `DELETE` endpoints on `store.controller.ts`
- [ ] Decide + implement fallback behavior (dual-resolve vs. replace)
- [ ] Decide apex-vs-`www` handling and document it for store owners
- [ ] Rebuild `domain.tsx` panel (connect → DNS instructions → poll → active/failed states)
- [ ] Track custom-domain count; alert before nearing 100 (Free plan) and upgrade `dreambiz.app` zone to Pro if needed
