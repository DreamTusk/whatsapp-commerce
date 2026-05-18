# WhatsApp Commerce — Implementation Plan

## Overview
Three apps sharing one backend:
- `backend-apis` — Express + Prisma API server
- `store-admin` — Next.js portal for store owners to manage their store
- `store-customer` — Next.js storefront for customers to browse and order

---

## Project Structure
```
whatsapp-commerce/
├── backend-apis/          ← Shared API server (Express + Prisma)
├── store-admin/           ← Store owner admin portal (Next.js)
├── store-customer/        ← Customer storefront (Next.js, multi-tenant by domain)
├── docs/
└── implementation-plan.md
```

---

## Multi-Tenant Architecture (store-customer)

Each store gets its own domain. The domain identifies the tenant — no store ID in the URL.

**Production:**
- `freshmart.com` → Fresh Mart store
- `bakehouse.com` → Bake House store

**Local Development (via `/etc/hosts`):**
- `freshmart.localhost:3001` → Fresh Mart store
- `bakehouse.localhost:3001` → Bake House store

### Local Dev Setup (one-time, per developer)
Add to `/etc/hosts`:
```
127.0.0.1   freshmart.localhost
127.0.0.1   bakehouse.localhost
```

### How Tenant Resolution Works
Next.js middleware in `store-customer` reads the hostname on every request:
```
freshmart.localhost:3001  →  strip port  →  freshmart.localhost
                          →  API lookup  →  GET /api/store?domain=freshmart.localhost
                          →  inject store context into page
```

The backend `Store` model has a `domain` field:
- `freshmart.localhost` in development
- `freshmart.com` in production

Same code, different domain values per environment. No special cases needed.

### Adding a New Tenant (Dev)
1. Add `127.0.0.1 newstore.localhost` to `/etc/hosts`
2. Create store record in DB with `domain = newstore.localhost`
3. Visit `http://newstore.localhost:3001`

---

## Completed Work Log

### Session: 2026-05-18

#### TypeScript Migration (backend-apis)
- Installed: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/bcryptjs`, `@types/jsonwebtoken`
- Created `tsconfig.json` with `NodeNext` module resolution
- Updated `package.json` scripts:
  - `dev`: `tsx watch src/index.ts` (runs TS directly, no compile step needed)
  - `start`: `node dist/index.js` (production uses compiled output)
  - `build`: `tsc` (compiles TS → JS into `dist/`)
  - `seed`: `tsx src/scripts/seed.ts`
- Migrated all files from `.js` → `.ts` and deleted old `.js` files:
  - `src/index.ts`
  - `src/routes/webhook.ts`
  - `src/services/conversation.ts`
  - `src/services/order.ts`
  - `src/services/whatsapp.ts`
  - `src/utils/db.ts`
  - `src/utils/logger.ts`
  - `src/scripts/seed.ts`
- Created `src/types/index.ts` — shared interfaces: `CartItem`, `OrderItem`, `OrderFilters`, `StoreStats`, `LocationData`, `MessageInput`, `WhatsAppButton`, `WhatsAppSection`, `CatalogOrderData`, `WhatsAppMessage`

#### Schema Update
- Added `domain String? @unique` to `Store` model
- Migration: `add-store-domain`
- Updated `seed.ts` to set `domain: 'freshmart.localhost'` on test store

#### User ↔ Store Relationship Redesign
- Removed `storeId` and `role` from `User` model
- Added `UserStore` join table (`userId`, `storeId`, `role`)
- **DB level**: one user can belong to many stores
- **API level**: enforced one-store-per-user limit (check in auth middleware — if user already has a store, block creation of a second one)
- Migration: `user-store-join-table`
- This allows future multi-store support by simply removing the API-level restriction

#### Env Fix
- Updated `.env.example` `DATABASE_URL` to use correct Docker credentials: `postgresql://postgres:postgres123@localhost:5432/whatsapp_commerce`

---

## Phase 1 — Project Setup

### 1.1 Create Next.js Apps
Run from `whatsapp-commerce/` root:

```bash
# Admin portal
npx create-next-app@latest store-admin --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm

# Customer storefront
npx create-next-app@latest store-customer --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

### 1.2 Install Dependencies

**store-admin:**
```bash
npm install axios @tanstack/react-query react-hook-form zod @hookform/resolvers lucide-react recharts js-cookie
npm install @shadcn/ui
npx shadcn@latest init
```

**store-customer:**
```bash
npm install axios @tanstack/react-query react-hook-form zod @hookform/resolvers lucide-react
npx shadcn@latest init
```

### 1.3 Environment Variables

**store-admin/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**store-customer/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 1.4 Run Ports
- `backend-apis` → port `3000`
- `store-admin` → port `3001`
- `store-customer` → port `3002`

### 1.5 Folder Structure

**store-admin:**
```
store-admin/
├── app/
│   ├── (auth)/login/
│   └── (dashboard)/
│       ├── layout.tsx         # Sidebar + header shell
│       ├── page.tsx           # Stats overview
│       ├── orders/
│       ├── products/
│       ├── categories/
│       ├── customers/
│       └── settings/
├── components/
│   ├── ui/                    # shadcn components
│   ├── layout/                # Sidebar, Header
│   └── shared/                # DataTable, StatusBadge, ConfirmDialog
├── lib/
│   ├── api.ts                 # Axios instance with JWT interceptors
│   └── utils.ts
├── hooks/                     # React Query hooks per resource
├── types/                     # TypeScript interfaces
└── middleware.ts              # JWT route protection
```

**store-customer:**
```
store-customer/
├── app/
│   ├── page.tsx               # Home — category listing
│   ├── products/page.tsx      # All products
│   ├── cart/page.tsx          # Cart
│   ├── checkout/page.tsx      # Address + payment
│   └── orders/[id]/page.tsx   # Order tracking
├── components/
│   ├── ui/                    # shadcn components
│   ├── layout/                # Header, Footer, CartDrawer
│   └── shared/                # ProductCard, CategoryCard, OrderStatus
├── lib/
│   ├── api.ts                 # Axios + domain-aware store resolver
│   ├── store-context.tsx      # Store info React context
│   └── utils.ts
├── hooks/
├── types/
└── middleware.ts              # Domain → store resolution
```

---

## Phase 2 — Backend Changes (backend-apis)

### 2.1 Schema Update — Add `domain` to Store
```prisma
model Store {
  ...
  domain  String?  @unique   // e.g. "freshmart.localhost" or "freshmart.com"
  ...
}
```
Run: `npx prisma migrate dev --name add-store-domain`

### 2.2 Auth Routes (`/api/auth`)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/signup` | Create user account (name, email, password) |
| POST | `/api/auth/login` | Email + password → JWT |
| GET | `/api/auth/me` | Get current user + store (if any) |

- Hash passwords with `bcryptjs`
- Sign JWT with `JWT_SECRET`
- Signup returns `{ token, user }`
- Login returns `{ token, user, store }` (store is null if not yet created)

### 2.3 Auth Middleware
- `src/middleware/auth.js` — verify JWT, attach `req.user` + `req.storeId`

### 2.4 Admin Routes (`/api/admin`) — JWT protected
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/admin/store` | Create store (first-time setup, one per user enforced at API level) |
| GET | `/api/admin/store` | Get store settings |
| PUT | `/api/admin/store` | Update store settings |
| GET | `/api/admin/orders` | List orders (filters: status, date) |
| PUT | `/api/admin/orders/:id/status` | Update order status |
| GET/POST | `/api/admin/products` | List / create products |
| PUT/DELETE | `/api/admin/products/:id` | Update / delete product |
| GET/POST | `/api/admin/categories` | List / create categories |
| PUT/DELETE | `/api/admin/categories/:id` | Update / delete category |
| GET | `/api/admin/customers` | List customers |
| GET | `/api/admin/stats` | Daily/weekly stats |

### 2.5 Public Customer Routes (`/api/storefront`) — domain-resolved, no auth
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/storefront/store` | Store info by domain header |
| GET | `/api/storefront/categories` | Categories for the store |
| GET | `/api/storefront/products` | Products (filter by category) |
| POST | `/api/storefront/orders` | Place new order |
| GET | `/api/storefront/orders/:id` | Track order by ID |

> Domain passed as `X-Store-Domain` request header by the customer frontend middleware.

---

## Phase 3 — store-admin: Auth

- Login page with email + password form
- JWT stored in httpOnly cookie
- `middleware.ts` protects all `/(dashboard)` routes
- Axios interceptor attaches token to every request

---

## Phase 4 — store-admin: Dashboard Shell

- Sidebar: Dashboard, Orders, Products, Categories, Customers, Settings
- Top header: store name, user avatar, logout
- Responsive — collapsible sidebar on mobile

---

## Phase 5 — store-admin: Pages

### 5.1 Dashboard
- Stats cards: today's orders, revenue, pending, total customers
- Bar chart: orders this week
- Recent orders table (last 10)

### 5.2 Orders
- Table with filters (status, payment, date range)
- Order detail: items, customer, address, status updater

### 5.3 Products
- Table: image, name, category, price, stock toggle
- Add/Edit form with image upload (Cloudinary)
- Delete with confirmation

### 5.4 Categories
- Table with sort order management
- Add/Edit/Delete

### 5.5 Customers
- Table: name, phone, order count, last order
- Customer detail: order history

### 5.6 Settings
- Store name, logo, address, min order, delivery radius
- WhatsApp config (read-only)

---

## Phase 6 — store-customer: Storefront

### 6.1 Middleware — Tenant Resolution
```ts
// middleware.ts
const hostname = request.headers.get('host')   // freshmart.localhost:3002
const domain = hostname.split(':')[0]           // freshmart.localhost
// Forward as X-Store-Domain header to all API calls
```

### 6.2 Pages
- **Home** — store banner, category grid
- **Products** — product cards with add-to-cart
- **Cart** — line items, quantity controls, total
- **Checkout** — delivery address (map pin or manual), COD / online payment
- **Order Tracking** — live order status with timeline

### 6.3 Cart State
- Stored in `localStorage` (no login required for customers)
- Tied to the domain so carts don't bleed across tenants

---

## Phase 7 — Landing Page & Waitlist

**Goal:** Early access signups from real store owners before full launch.

### 7.1 New App
- Add `landing/` as a Next.js app at the project root (port `3003`)
- Mobile-first, single page

### 7.2 Page Sections
1. **Hero** — value prop + "Apply for Early Access" CTA
2. **Problem** — show the pain of manual WhatsApp order taking
3. **Demo** — short screen recording or GIF of the customer ordering flow
4. **Features** — Automated ordering, Product catalog, Order tracking
5. **Who it's for** — Grocery, restaurants, D2C, any local store
6. **Early access form** — Name, store type, WhatsApp number, city
7. **Footer**

### 7.3 Backend
- Add `WaitlistEntry` model to Prisma schema
- `POST /api/waitlist` — public endpoint, no auth
- Store: name, store type, WhatsApp number, city, timestamp

### 7.4 GTM — Distribution Channels
| Channel | Why |
|---------|-----|
| WhatsApp groups (local business groups) | Audience is already there |
| Instagram reels showing the demo | Visual product, visual medium |
| IndiaMART / JustDial store owners | High-intent, already selling online |
| Referral from beta stores | Best signal for next cohort |

---

## Phase 8 — Polish & Production

- Loading skeletons on all data tables and product grids
- Toast notifications (success/error)
- Empty states
- Full mobile responsiveness
- Production env configs
- CORS update in backend to allow storefront and landing domains

---

## Build Order Summary

| Step | What | Where |
|------|------|-------|
| 1 | Create both Next.js projects | `store-admin/`, `store-customer/` |
| 2 | Add `domain` to Store schema + migrate | `backend-apis/` |
| 3 | Build auth API + middleware | `backend-apis/` |
| 4 | Build admin routes | `backend-apis/` |
| 5 | Build storefront public routes | `backend-apis/` |
| 6 | Admin login + route protection | `store-admin/` |
| 7 | Admin dashboard shell | `store-admin/` |
| 8 | Admin pages (orders, products, categories) | `store-admin/` |
| 9 | Customer storefront middleware + home | `store-customer/` |
| 10 | Customer cart + checkout + order tracking | `store-customer/` |
| 11 | Landing page + waitlist form | `landing/` |
| 12 | Polish + production readiness | all |

---

## Developer Onboarding Checklist

For every new developer joining the project:

1. Clone the repo
2. Add to `/etc/hosts`:
   ```
   127.0.0.1   freshmart.localhost
   127.0.0.1   bakehouse.localhost
   ```
3. Copy `.env.example` → `.env` in `backend-apis/`
4. Run `docker compose up -d` in `backend-apis/`
5. Run `npx prisma migrate dev` in `backend-apis/`
6. Run `npm run dev` in each app on their respective ports
