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

## API Conventions

- **Request/Response body fields** — always `snake_case` (e.g. `user_id`, `new_password`, `refresh_token`, `min_order_amount`)
- **Route paths** — always `kebab-case` (e.g. `/verify-user`, `/forgot-password`)
- **HTTP methods** — follow REST: `GET` read, `POST` create, `PUT` update, `DELETE` delete
- **snake_case is applied manually per route** — no global transform middleware. Every route handler must explicitly map Prisma camelCase fields to snake_case before sending the response.

> All new APIs must follow these conventions without exception.

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

#### RefreshToken Table
- Added `RefreshToken` model with fields: `id`, `token`, `userId`, `isRevoked`, `expiresAt`, `createdAt`
- `isRevoked Boolean @default(false)` — set to true on logout or password change
- Token rows are never deleted — provides audit trail. Cleanup job needed in Phase 8
- Migration: `add-refresh-token` + `add-refresh-token-revoke`

#### Env Fix
- Updated `.env.example` `DATABASE_URL` to use correct Docker credentials: `postgresql://postgres:postgres123@localhost:5432/whatsapp_commerce`

---

### Session: 2026-05-18 (store-admin — Auth Module)

#### Branding
- App is branded **DT Commerce** (not "WhatsApp Commerce") across all UI

#### Dependencies installed (store-admin)
- `axios`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`
- `lucide-react`, `js-cookie`, `@types/js-cookie`
- `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`, `@base-ui/react`
- shadcn/ui initialized (Tailwind v4 mode); components added: `button`, `input`, `label`, `card`, `sonner`, `separator`
- Removed stale `yarn.lock` — project uses npm exclusively

#### Next.js 16 notes
- `middleware.ts` is **deprecated** in Next.js 16; route protection uses `proxy.ts` instead
- Turbopack is the default bundler (no flags needed)

#### Files created
| File | Purpose |
|------|---------|
| `.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:3000` |
| `proxy.ts` | Route protection — redirects unauthenticated users away from `/dashboard`, `/create-store`; redirects authenticated users away from auth pages |
| `lib/api.ts` | Axios instance with JWT interceptor + auto-refresh on 401 |
| `lib/auth.ts` | Cookie helpers — `setTokens`, `getUser`, `setPendingUserId`, `clear`, `isAuthenticated` |
| `types/index.ts` | Shared TS interfaces: `User`, `Store`, `AuthResponse`, `ApiError` |
| `app/globals.css` | Primary color overridden to WhatsApp green `oklch(0.742 0.196 151.74)` |
| `app/layout.tsx` | Root layout — adds `<Toaster>` (Sonner), updated metadata to "DT Commerce" |
| `app/page.tsx` | Root redirects to `/login` |
| `app/(auth)/layout.tsx` | Split-panel auth shell — green brand panel (desktop) + white form panel |
| `app/(auth)/login/page.tsx` | Login form — email + password, show/hide password, forgot-password link |
| `app/(auth)/signup/page.tsx` | Signup form — name + email + password, saves `pending_user_id` cookie, redirects to `/verify-email` |
| `app/(auth)/verify-email/page.tsx` | 6-digit OTP input (individual boxes, paste support, backspace navigation), 60s resend countdown |
| `app/(auth)/forgot-password/page.tsx` | Email entry — sends OTP via API, redirects to `/reset-password?email=...` |
| `app/(auth)/reset-password/page.tsx` | OTP boxes + new password + confirm password — wrapped in `<Suspense>` for `useSearchParams` |
| `app/dashboard/page.tsx` | Stub page (placeholder until dashboard is built) |

#### Token storage decision
- Access token and refresh token stored in **cookies** (not localStorage)
- Reason: `proxy.ts` runs server-side and can only read cookies, not localStorage — needed for route protection redirects
- Cookies use `sameSite: 'lax'` for CSRF protection; access token expires in 40 min, refresh token in 21 days

#### Backend changes made to support frontend
- Installed `cors` + `@types/cors` in `backend-apis`
- Added `cors()` middleware to `src/index.ts` — allows origins: `localhost:3001`, `3002`, `3003` with `credentials: true`
- Added `POST /api/auth/resend-otp` route — was missing from backend; verify-email page uses it for the resend button
- Fixed `next.config.ts` — set `turbopack.root` to silence workspace-root detection warning

#### Auth flow implemented
```
Signup  → POST /api/auth/signup  → save tokens + pending_user_id → /verify-email
Verify  → POST /api/auth/verify-user (user_id + otp)             → /dashboard
Login   → POST /api/auth/login   → save tokens → /dashboard (store exists) or /create-store
Forgot  → POST /api/auth/forgot-password (email)                 → /reset-password?email=...
Reset   → POST /api/auth/reset-password (email + otp + new_password) → /login
```

---

### Session: 2026-05-20 (continued)

#### API Route Prefix Change
- Removed `/admin` from all admin API route paths
- `/api/admin/store` → `/api/store`
- `/api/admin/invite` → `/api/invite`
- Future routes follow the same pattern: `/api/categories`, `/api/orders`, `/api/products`, etc.
- Updated: `src/app.ts`, route file comments, `store-admin` frontend calls, `store.test.ts`, `implementation-plan.md`

#### Schema Update
- Added `imageUrl String?` to `Category` model
- Migration: `add-category-image`

---

### Session: 2026-05-23 — Orders, Cart, Wishlist, Customer Auth Design

#### Schema decisions (pending migration)

**Order refactor** — replace JSON `items` field with proper relational tables:
- `Order` — keeps fulfilment fields only (`status`, `address`, `notes`). Payment fields removed into separate table.
- `OrderItem` — one row per line item. Stores `productName` + `price` as **snapshots** (product can change after order). Keeps FK to `Product` for analytics.
- `Payment` — 1-to-1 with `Order`. Owns `method`, `status`, `razorpayLinkId`, `razorpayPaymentId`, `paidAt`.

**New tables:**
- `CartItem` — server-side cart. `@@unique([customerId, productId])`. Requires customer JWT.
- `WishlistItem` — server-side wishlist. `@@unique([customerId, productId])`. Requires customer JWT.
- `CustomerOtp` — separate from admin `OtpVerification`. Keyed by `phone + storeId`, not FK to Customer.

**Changes to existing models:**
- `Customer.phone` → `String?` (optional, for future email/Google auth)
- `Store.customerAuthMethods String[] @default(["PHONE_OTP"])` — store admin configures allowed login methods

#### Customer auth design
- Phone OTP only for now. Store admin can enable more methods later (EMAIL_OTP, GOOGLE, WHATSAPP_OTP).
- JWT: `{ customerId, storeId, phone }`, 30-day expiry, no refresh token.
- `verify-otp` response includes `is_new: boolean` — frontend detects first-time vs returning customer.
- Profile (name, address) only returned **after** OTP verification — never on phone lookup alone.

#### UI pattern — shadcn Dialog
- All modals in `store-admin` use shadcn `Dialog` component (Base UI under the hood).
- Form/data-entry modals: `disablePointerDismissal` prop → outside click does NOT close.
- Delete confirm modals: default behavior → outside click closes (no data to lose).
- Correct Base UI v1.5 prop name: `disablePointerDismissal` (NOT `dismissible`).

---

### Session: 2026-05-23 — Products Module

#### Backend — Admin Products (`/api/products`, JWT protected)
- `GET /api/products` — returns all products for the store, optional `?category_id=` filter, ordered by `sort_order`
- `POST /api/products` — creates product; `name`, `price`, `category_id` required; accepts image upload; validates category belongs to store
- `PUT /api/products/:id` — updates product; ownership verified; sort_order swap logic (same as categories, scoped per category)
- `DELETE /api/products/:id` — deletes product; ownership verified
- File: `src/routes/admin/products.ts`

#### Backend — Public Storefront Products (`/api/storefront/products`, no auth)
- `GET /api/storefront/products` — returns only in-stock products, resolved by `x-store-domain`, optional `?category_id=` filter
- File: `src/routes/storefront/products.ts`

#### Categories — Sort Order Swap
- `PUT /api/categories/:id` — if `sort_order` conflicts with another category in the same store, the two swap values atomically
- Same pattern applied to products (scoped per category)

#### store-admin — Products Page
- Table: product image, name, local name, category, price, unit, in-stock toggle
- Category filter tabs at top
- Add/Edit modal: image, name, local name, description, price, unit, category dropdown, sort order, stock toggle
- Delete confirm modal
- Inline in-stock/out-of-stock toggle
- `Product` type added to `store-admin/types/index.ts`
- File: `store-admin/app/dashboard/products/page.tsx`

#### store-customer — Products Page (ISR)
- `store-customer/app/products/page.tsx` — ISR, reads `?category` query param
- Category filter tabs + product grid with add-to-cart button (cart logic TBD)
- `Product` type added to `store-customer/types/index.ts`

#### Bruno Docs
- `Products/` folder: Get All (with `category_id` query param), Add, Update, Delete
- `Public Customer API's/Get Products.bru` — with `x-store-domain` header + `category_id` query param

### Session: 2026-05-23 — Categories Module

#### Backend — Admin Categories (`/api/categories`, JWT protected)
- `GET /api/categories` — returns all categories (active + inactive) for the authenticated user's store, ordered by `sort_order`
- `POST /api/categories` — creates category; accepts `multipart/form-data` with `name` (required), `name_local`, `sort_order`, `is_active`, `image`
- `PUT /api/categories/:id` — updates category; ownership verified against `userStore.storeId`
- `DELETE /api/categories/:id` — deletes category; ownership verified
- File: `src/routes/admin/categories.ts`

#### Backend — Public Storefront Categories (`/api/storefront/categories`, no auth)
- `GET /api/storefront/categories` — returns only active categories, resolved by `x-store-domain` header
- Customers hit this endpoint directly — no token required
- File: `src/routes/storefront/categories.ts`

#### store-admin — Categories Page
- Table: category image, name, local name, sort order, active/inactive toggle
- Add/Edit modal: image upload, name, local name, sort order, status toggle
- Delete confirm modal
- Inline active/inactive toggle without opening the modal
- File: `store-admin/app/dashboard/categories/page.tsx`
- `Category` type added to `store-admin/types/index.ts`

#### store-customer — Home Page (ISR)
- Fetches store info + active categories in parallel using `apiFetch` (ISR, revalidate: 60s)
- Shows store header (logo, name, address) + category grid
- Each category card links to `/products?category={id}`
- `Category` type added to `store-customer/types/index.ts`
- File: `store-customer/app/page.tsx`

### Session: 2026-05-23

#### Image Storage — Local filesystem (temporary)
- Replaced `src/external-services/cloudinary.ts` with `src/external-services/storage.ts`
- Images are saved to `uploads/{folder}/{uuid}.jpg` on the local filesystem
- Served statically via `GET /uploads/*` from `app.ts`
- Same `uploadImage(buffer, folder)` / `deleteImage(path)` interface — swap to Cloudinary/S3 later with no route changes
- Updated import in `src/routes/admin/store.ts` and mock in `src/tests/store.test.ts`

#### Email — Console logging (temporary)
- Replaced Gmail SMTP (nodemailer) in `src/workers/email.ts` with `console.log`
- OTPs and notifications are printed to the server console during development
- Zepto Mail SMTP will be wired in when ready — `sendSimpleEmail(to, subject, body)` interface stays the same

#### Auth — Email verification gate on signup
- `POST /api/auth/signup` now returns `is_verified: false` in the response
- Frontend stores `is_verified` as a cookie via `auth.setVerified(false)` on signup
- `store-admin/proxy.ts` blocks unverified users (token exists + `is_verified === 'false'`) from all routes except `/verify-email`
- After OTP success, `auth.setVerified(true)` is set — user proceeds to `/dashboard`
- After login success, `auth.setVerified(true)` is set — login only succeeds for verified users (backend enforced)
- `auth.clear()` now also removes the `is_verified` cookie

#### Store — Domain field required
- `domain` is now a required field in `POST /api/store` (alongside `name` and `phone`)
- Added explicit `409 Domain already in use` check before DB insert
- `store-admin/app/create-store/page.tsx` now includes a `domain` input with validation (lowercase, letters/numbers/dots/hyphens only)

### Session: 2026-05-20

#### Auth — Login Verification Gate
- Added `isVerified` check to `POST /api/auth/login` — unverified users are blocked with `403`
- 403 response includes `{ error, is_verified: false, user_id }` so the frontend can redirect the user to `/verify-email` with the `user_id` pre-filled
- Verification flow for blocked users: 403 login → `POST /api/auth/resend-otp` (email) → `POST /api/auth/verify-user` (user_id + otp) → login succeeds

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

#### Token Strategy
- **Access Token** — JWT, signed with `JWT_SECRET`, expires in **40 minutes**, never stored in DB
- **Refresh Token** — random 64-byte hex string, stored in `RefreshToken` table, expires in **21 days**
- Access token verified by signature + expiry check (stateless, no DB lookup)
- Refresh token verified by DB lookup → check `isRevoked` → check `expiresAt`

#### Auth Flow
```
Signup/Login → { accessToken, refreshToken }
Every API call → Authorization: Bearer <accessToken>
Access token expires → POST /api/auth/refresh { refreshToken } → { accessToken }
Logout → POST /api/auth/logout { refreshToken } → sets isRevoked = true in DB
```

#### Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | No | Create user account |
| POST | `/api/auth/login` | No | Login with email + password |
| POST | `/api/auth/refresh` | No | Get new access token using refresh token |
| POST | `/api/auth/logout` | No | Revoke refresh token |
| GET | `/api/auth/me` | Yes | Get current user + store |

#### Request / Response Shapes

**POST /api/auth/signup**
```
Request:  { name, email, password (min 6 chars) }
Response: { accessToken, refreshToken, user: { id, name, email } }
Errors:   400 missing fields | 400 short password | 409 email taken
```

**POST /api/auth/login**
```
Request:  { email, password }
Response: { accessToken, refreshToken, user: { id, name, email }, store: Store | null }
Errors:   400 missing fields | 401 invalid credentials
          403 unverified → { error, is_verified: false, user_id } — frontend redirects to /verify-email
```

**POST /api/auth/refresh**
```
Request:  { refreshToken }
Response: { accessToken }
Errors:   400 missing token | 401 invalid | 401 revoked | 401 expired
```

**POST /api/auth/logout**
```
Request:  { refreshToken }
Response: { message: "Logged out successfully" }
Action:   sets isRevoked = true on the RefreshToken row
```

**GET /api/auth/me**
```
Headers:  Authorization: Bearer <accessToken>
Response: { user: { id, name, email }, store: Store | null }
Errors:   401 no token | 401 invalid token | 404 user not found
```

#### OTP Email Verification

**Flow:**
```
Signup → isVerified = false → generate 6-digit OTP → save in OtpVerification table (expires 10 mins) → send to email via Gmail SMTP
User submits OTP → POST /api/auth/verify-otp → check DB → valid + not used + not expired → isVerified = true
Resend OTP → POST /api/auth/resend-otp → mark old OTPs isUsed = true → generate new OTP → send email
```

**OTP Rules:**
- 6-digit numeric OTP
- Expires in 10 minutes
- `isUsed = true` after successful verification (prevents reuse)
- On resend — all previous OTPs for that user marked `isUsed = true`

**Email Service:** Zepto Mail — to be integrated later (see Roadmap)

**Routes:**
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/verify-otp` | No | Submit OTP to verify email |
| POST | `/api/auth/resend-otp` | No | Resend OTP (invalidates old ones) |

**POST /api/auth/verify-user**
```
Request:  { user_id, otp }
Response: { message: "Email verified successfully" }
Errors:   400 missing fields | 400 invalid/expired OTP | 409 already verified
```

**POST /api/auth/resend-otp**
```
Request:  { email }
Response: { message: "OTP sent successfully" }
Errors:   400 missing email | 404 user not found | 409 already verified
```

#### Forgot Password Flow

**Routes:**
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/forgot-password` | No | Send OTP to email for password reset |
| POST | `/api/auth/reset-password` | No | Verify OTP + set new password |

**POST /api/auth/forgot-password**
```
Request:  { email }
Response: { message: "OTP sent to your email" }
Errors:   400 missing email | 404 user not found
Note:     Reuses OtpVerification table (same as email verification OTP)
```

**POST /api/auth/reset-password**
```
Request:  { email, otp, newPassword (min 6 chars) }
Response: { message: "Password reset successfully" }
Errors:   400 missing fields | 400 short password | 404 user not found | 400 invalid/expired OTP
Actions:  mark OTP isUsed = true | hash new password | revoke all refresh tokens (force re-login)
```

### 2.3 Auth Middleware
- `src/middleware/auth.js` — verify JWT, attach `req.user` + `req.storeId`

### 2.4 Admin Routes (`/api/admin`) — JWT protected
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/store` | Create store (first-time setup, one per user enforced at API level) |
| GET | `/api/store` | Get store settings |
| PUT | `/api/store` | Update store settings |

**POST /api/store**
```
Headers:  Authorization: Bearer <accessToken>
Request:  {
  name,                          (required)
  phone,                         (required)
  domain,                        (optional)
  address,                       (optional)
  logo,                          (optional)
  min_order_amount,              (optional, default 0)
  delivery_radius,               (optional)
  whatsapp_phone_number_id,      (optional, configure later)
  whatsapp_business_account_id,  (optional, configure later)
  whatsapp_access_token          (optional, configure later)
}
Response: { store }
Errors:   400 missing required fields | 409 store already exists | 409 phone taken
Note:     One store per user enforced at API level. Creates UserStore join record with role=admin.
```

**GET /api/store**
```
Headers:  Authorization: Bearer <accessToken>
Response: { store }
Errors:   404 store not found
```

**PUT /api/store**
```
Headers:  Authorization: Bearer <accessToken>
Request:  any store fields to update (all optional)
Response: { store }
Errors:   404 store not found
```

**DELETE /api/store**
```
Headers:  Authorization: Bearer <accessToken>
Response: { message: "Store deleted successfully" }
Errors:   404 store not found
```

**Email Notifications (all store operations)**
- Create → "Your store {name} has been created successfully"
- Update → "Your store {name} details have been updated"
- Delete → "Your store {name} has been deleted"
- Sent to the logged-in user's email after each operation
| GET | `/api/orders` | List orders (filters: status, date) |
| PUT | `/api/orders/:id/status` | Update order status |
| GET/POST | `/api/products` | List / create products |
| PUT/DELETE | `/api/products/:id` | Update / delete product |
| GET/POST | `/api/categories` | List / create categories |
| PUT/DELETE | `/api/categories/:id` | Update / delete category |
| GET | `/api/customers` | List customers |
| GET | `/api/stats` | Daily/weekly stats |

### 2.5 Public Customer Routes (`/api/storefront`) — domain-resolved

#### No auth required
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/storefront/store` | Store info by domain header |
| GET | `/api/storefront/categories` | Active categories for the store |
| GET | `/api/storefront/products` | In-stock products (filter by category) |
| GET | `/api/storefront/products/:id` | Single product detail |
| GET | `/api/storefront/auth/methods` | Which login methods are enabled for this store |
| POST | `/api/storefront/auth/send-otp` | Send OTP to phone number |
| POST | `/api/storefront/auth/verify-otp` | Verify OTP → returns customer JWT + `is_new` flag |
| POST | `/api/storefront/auth/logout` | Clear customer session |

#### Customer JWT required (`x-customer-token` header or cookie)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/storefront/auth/me` | Get current customer profile |
| GET/POST/PATCH/DELETE | `/api/storefront/cart` | Cart CRUD |
| GET/POST/DELETE | `/api/storefront/wishlist` | Wishlist CRUD |
| POST | `/api/storefront/orders` | Place new order |
| GET | `/api/storefront/orders/:id` | Track order by ID |

> Domain passed as `X-Store-Domain` request header by the customer frontend middleware.

#### Customer JWT design
- Payload: `{ customerId, storeId, phone }`
- Expiry: **30 days** — no refresh token (OTP is the re-auth mechanism)
- `storeId` in payload allows validating against `x-store-domain` header without a DB call
- Same phone → different `customerId` per store (`Customer` is unique by `phone + storeId`)

#### Customer auth flow — details first, OTP second
```
No JWT cookie:
  Checkout page → fill name + phone + address → [Send OTP]
  → OTP sent to entered phone
  → enter OTP → [Verify & Place Order]
  → verify-otp returns { customer, is_new, access_token }
      is_new: true  → first visit, save filled details to Customer profile
      is_new: false → returning customer, pre-fill saved name + address

JWT cookie valid:
  Checkout page → name + phone + address pre-filled from profile
  → [Place Order] directly, no OTP needed
```

**Security:** Customer profile (name, address) is only revealed **after** OTP verification — not on phone number entry alone.

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

### 6.1 Rendering Strategy

The storefront uses **Next.js ISR (Incremental Static Regeneration)** — not a choice between static or dynamic, but both per page type.

| Page | Rendering | Reason |
|------|-----------|--------|
| Home (category grid) | ISR | SEO + fast load, revalidate on category change |
| Products listing | ISR | SEO + fast load, revalidate on product change |
| Product detail | ISR | SEO + fast load, revalidate on product change |
| Cart | Client-side only | No SEO needed, localStorage state |
| Checkout | Client-side only | Dynamic, payment redirect |
| Order tracking | Client-side only | Per-user, no SEO needed |

**How ISR works here:**
- First visitor to `freshmart.com/products` triggers static generation, page is cached at the edge
- When a store owner updates a product in the admin, the backend calls `revalidatePath()` to bust the cache
- Next visitor gets a fresh static page
- Cache is domain-scoped so each tenant's pages are independent

**Deployment:** Vercel (or any edge CDN with Next.js ISR support). Store owners point their domain DNS to it.

**Payments:** Razorpay hosted checkout — always a client-side redirect, fits naturally with checkout being non-static.

### 6.2 Middleware — Tenant Resolution
```ts
// middleware.ts
const hostname = request.headers.get('host')   // freshmart.localhost:3002
const domain = hostname.split(':')[0]           // freshmart.localhost
// Forward as X-Store-Domain header to all API calls
```

### 6.3 Pages

| Page | Rendering | Auth required |
|------|-----------|--------------|
| Home | ISR | No |
| Products listing | ISR | No |
| Product detail | ISR | No |
| Cart | Client-side | Yes — OTP triggered on first "Add to cart" |
| Wishlist | Client-side | Yes — OTP triggered on first "♡" click |
| Checkout | Client-side | Yes — already authed via cart |
| Order tracking `/orders/:id` | Client-side | Yes |

### 6.4 Cart + Wishlist State
- **Server-side** — stored in `CartItem` / `WishlistItem` DB tables, not localStorage
- Auth (phone OTP) is triggered lazily when customer first clicks "Add to cart" or "♡"
- After OTP verification, JWT cookie set (30 days) — returning customers skip OTP
- Cart is scoped per customer + store — no cross-tenant bleed

### 6.5 Checkout Flow
```
Cart page → Proceed to checkout
  No JWT:  fill name + phone + address → Send OTP → Verify → Place Order
  Has JWT: name + phone + address pre-filled → Place Order directly
```

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
