# Razorpay Integration Plan

## Overview

Multi-tenant online payment integration using Razorpay Orders API + Checkout.js.
Each store has its own Razorpay account. Payment provider credentials are stored in a
separate `StorePaymentProvider` table — designed to support multiple gateways per store.

---

## Flow

```
Customer selects "Pay Online" at checkout
        │
        ▼
POST /api/storefront/orders  { payment_method: "ONLINE", ...items, address }
        │
        ▼
Backend:
  1. Validate cart, address, stock
  2. Fetch active StorePaymentProvider where provider = "RAZORPAY"
  3. Decrypt keySecret
  4. Create DB Order (status: NEW) + Payment (status: PENDING)
  5. Call Razorpay Orders API → get razorpay_order_id
  6. Save razorpay_order_id to Payment.razorpayOrderId
  7. Return { order_id, razorpay_order_id, razorpay_key_id, amount_paise }
        │
        ▼
Frontend opens Razorpay Checkout.js modal
  { key: razorpay_key_id, order_id: razorpay_order_id, amount, ... }
        │
        ▼
Customer completes payment inside modal
        │
        ▼
Razorpay returns to handler.success:
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        │
        ▼
Frontend → POST /api/storefront/orders/:id/verify-payment
  { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        │
        ▼
Backend:
  1. HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, keySecret)
     == razorpay_signature ✓
  2. Idempotency check — skip if already PAID
  3. Set Payment.status = PAID, Payment.paidAt = now()
  4. Set Payment.razorpayPaymentId
  5. Set Order.status = CONFIRMED
        │
        ▼
Frontend redirects to /orders/:id (confirmed)
```

---

## Network Failure Note

If the customer's browser closes or network drops after payment but before `verify-payment`
is called — the order stays PENDING. Customer would need to contact the store to confirm manually.

Webhook-based auto-recovery can be added later as a separate task. See "Future — Webhook" section.

---

## Security

### Key Storage
- Store owner enters `keyId` and `keySecret` in store settings
- `keySecret` encrypted with AES-256-GCM before saving to DB
- Decrypted in memory only when needed (order creation, signature verification)
- Single `ENCRYPTION_KEY` env var on server — DB breach alone cannot expose secrets

### Signature Verification
- `HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, keySecret)` must match `razorpay_signature`
- Verified before any DB update

---

## Schema Changes

### New table — StorePaymentProvider

```prisma
model StorePaymentProvider {
  id        String   @id @default(cuid())
  storeId   String
  provider  String   // "RAZORPAY" | "STRIPE" | "PAYU"
  keyId     String   // public key — returned to frontend
  keySecret String   // encrypted ciphertext — never sent to client
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  Store     Store    @relation(fields: [storeId], references: [id])

  @@unique([storeId, provider])  // one config per provider per store
}
```

One store can have multiple providers:
```
storeId   provider    isActive
───────────────────────────────
store_1   RAZORPAY    true
store_1   STRIPE      false     ← configured but inactive
store_2   RAZORPAY    true
store_2   PAYU        true      ← both active
```

### Add relation to Store
```prisma
model Store {
  // ... existing fields
  StorePaymentProvider StorePaymentProvider[]
}
```

### No changes to Payment model
Existing fields cover everything:
- `razorpayOrderId`    → Razorpay order ID
- `razorpayPaymentId` → Razorpay payment ID (set after capture)
- `status`            → PENDING → PAID / FAILED
- `paidAt`            → set when PAID

---

## Environment Variables

### backend-apis-nest/.env
```
ENCRYPTION_KEY=<32-byte-hex-string>   # AES-256-GCM encryption for keySecret
```

---

## What Gets Built

### 1. Schema + Migration
- Add `StorePaymentProvider` table
- Run `npx prisma migrate dev --name add-store-payment-providers`

### 2. Backend — Crypto Utility
- `src/utils/crypto.ts` — `encrypt(text): string` + `decrypt(ciphertext): string`
- Node built-in `crypto` module (AES-256-GCM), no external dependency

### 3. Backend — Payment Providers Module (admin)
- `GET /api/payment-providers` — list all providers for the store (`keySecret` never returned)
- `POST /api/payment-providers` — add a provider (encrypt keySecret before save)
- `PUT /api/payment-providers/:id` — update keyId / keySecret / isActive
- `DELETE /api/payment-providers/:id` — remove a provider

### 4. Backend — Storefront Store
- `GET /api/storefront/store` — include `active_payment_providers: ["RAZORPAY"]`
- Frontend uses this to decide which payment options to show at checkout

### 5. Backend — Storefront Orders
- `POST /api/storefront/orders` — when `payment_method: "ONLINE"`:
  - Fetch active Razorpay provider for store, else `400 Online payments not configured`
  - Decrypt keySecret
  - Create Razorpay order via SDK
  - Save `razorpay_order_id` to `Payment.razorpayOrderId`
  - Return `{ order, razorpay_order_id, razorpay_key_id, amount_paise }`
- `POST /api/storefront/orders/:id/verify-payment`:
  - Accept `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
  - Verify HMAC signature
  - Idempotency check — skip if already PAID
  - Set Payment PAID + Order CONFIRMED

### 6. Frontend — store-admin Payment Providers Page
- New page: `dashboard/payment-providers`
- List configured providers with active/inactive badge
- Add provider form: select provider type, enter keyId + keySecret
- Edit: update keyId / keySecret, toggle active
- Delete with confirm modal
- `keySecret` field always write-only — never pre-filled, placeholder "Enter to update"

### 7. Frontend — store-customer Checkout
- Payment method selector shown only if store has active providers
- `Pay Online` option shown if Razorpay active
- Online flow:
  1. Place order → receive `razorpay_order_id` + `razorpay_key_id`
  2. Dynamically load Razorpay Checkout.js script
  3. Open modal with order details + store branding
  4. On `handler.success` → call verify-payment → redirect to /orders/:id
  5. On modal dismiss → show "Payment cancelled", order stays PENDING

---

## Bruno Docs to Add

| File | Route |
|------|-------|
| `Payment Providers/List.bru` | `GET /api/payment-providers` |
| `Payment Providers/Add.bru` | `POST /api/payment-providers` |
| `Payment Providers/Update.bru` | `PUT /api/payment-providers/:id` |
| `Payment Providers/Delete.bru` | `DELETE /api/payment-providers/:id` |
| `Storefront/Place Order (Online).bru` | `POST /api/storefront/orders` with `payment_method: ONLINE` |
| `Storefront/Verify Payment.bru` | `POST /api/storefront/orders/:id/verify-payment` |

---

## Build Order

1. Schema migration (`StorePaymentProvider` table)
2. `src/utils/crypto.ts` (encrypt/decrypt)
3. Install `razorpay` npm package
4. Admin payment providers module (CRUD)
5. Storefront store — return `active_payment_providers`
6. Storefront orders service — Razorpay order creation + verify-payment
7. store-admin payment providers page
8. store-customer checkout — payment method selector + Razorpay modal
9. Bruno docs

---

## Razorpay Dashboard Setup (store owner does this once)

1. Create account at razorpay.com
2. Settings → API Keys → Generate Test Key
3. Copy `Key ID` and `Key Secret` → paste in DT Commerce → Payment Providers

---

## Future — Webhook (not in current scope)

When network failure recovery is needed:
- `POST /api/razorpay/webhook` endpoint
- Verify with `RAZORPAY_WEBHOOK_SECRET` (global env var)
- Handle `payment.captured` → idempotent PAID + CONFIRMED
- Store owner adds webhook URL in Razorpay dashboard

## Future — Multiple Active Providers

When a store has Razorpay + Stripe both active:
- Checkout shows "Pay with Razorpay" and "Pay with Stripe" options
- Customer picks one
- `payment_method` in order body carries the provider name
