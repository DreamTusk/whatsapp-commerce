# Razorpay Webhook — Payment Recovery on Network Failure

## The Problem

When a customer pays online, the frontend calls `POST /api/storefront/orders/:id/verify-payment` to confirm the payment. If the customer's network drops after Razorpay captures the payment but before this call reaches the backend, the order stays stuck at `status: NEW` and `payment.status: PENDING` — even though money was deducted.

The webhook solves this by giving Razorpay a second, independent path to confirm the payment directly to the backend — no browser involved.

---

## How It Works

### Happy path (no network issue)

```
Customer pays in Razorpay modal
        ↓
Razorpay captures payment
        ↓
handler() fires in browser
        ↓
POST /api/storefront/orders/:id/verify-payment  ✅
        ↓
Payment → PAID, Order → CONFIRMED
        ↓
Customer redirected to /orders/:id
```

### Network failure path (webhook saves it)

```
Customer pays in Razorpay modal
        ↓
Razorpay captures payment
        ↓
Two things happen simultaneously and independently:

BROWSER                                RAZORPAY SERVERS
handler() fires                        POST /api/payments/razorpay-webhook/:storeId
        ↓                                      ↓
POST /verify-payment                   Verify HMAC signature
        ↓                                      ↓
❌ Network drops                        Find Payment by razorpayOrderId
        ↓                                      ↓
catch: "Payment verification           Payment → PAID
        failed"                        Order → CONFIRMED ✅
        ↓
Customer sees error,
refreshes orders page → order already CONFIRMED
```

### Both succeed (idempotency)

```
Browser calls /verify-payment  ─────────┐
                                        ▼
                               First to arrive:
                               Payment → PAID, Order → CONFIRMED

Razorpay webhook arrives  ──────────────┐
                                        ▼
                               Sees Payment.status === PAID
                               Returns 200, does nothing
```

No double update. Whichever arrives second exits early.

---

## Authentication — How the Webhook is Secured

The endpoint is **public** (no JWT guard) but self-authenticating via HMAC signature verification.

### Setup (one time)
1. You create a webhook in the Razorpay dashboard and set a secret string
2. Razorpay stores it on their side
3. You save the same secret in your DB via the admin app (Settings → Payments → Webhook Secret)
4. The backend stores it encrypted in `StorePaymentProvider.webhookSecret`

### Every webhook call
```
Razorpay computes:
  signature = HMAC-SHA256(webhookSecret, rawRequestBody)

Sends:
  POST /api/payments/razorpay-webhook/:storeId
  X-Razorpay-Signature: <signature>
  Body: { "event": "payment.captured", "payload": {...} }

Your backend:
  1. Gets storeId from URL
  2. Fetches webhookSecret from DB (decrypts it)
  3. Computes: expectedSig = HMAC-SHA256(webhookSecret, rawBody)
  4. Compares: expectedSig === X-Razorpay-Signature?
        ✅ Match  → process the event
        ❌ No match → return 400, ignore
```

### Why raw body matters
Razorpay signs the **exact bytes** of the request body. If the backend re-serializes the parsed JSON, whitespace or key order differences would change the hash and fail verification. `rawBody: true` in `main.ts` preserves the original bytes alongside the parsed object so both are available.

---

## Webhook URL Format

```
POST https://<your-backend>/api/payments/razorpay-webhook/<storeId>
```

The `storeId` in the URL is the `Store.id` from the database (a CUID). It identifies which store's webhook secret to use for verification. Each store configures their own webhook URL in Razorpay dashboard.

---

## Event Handled

| Event | Action |
|---|---|
| `payment.captured` | Marks `Payment.status = PAID`, sets `razorpayPaymentId` and `paidAt`, marks `Order.status = CONFIRMED` |

All other events return `{ received: true }` and are ignored.

---

## Setup Guide (per store)

**Step 1 — Get your webhook URL**
Go to store-admin → Settings → Payments. The webhook URL is shown on the Razorpay card after configuration.

**Step 2 — Configure in Razorpay dashboard**
- Razorpay Dashboard → Settings → Webhooks → Add New Webhook
- URL: paste your webhook URL
- Secret: enter any strong string (e.g. a random 32-char string)
- Events: check `payment.captured`
- Save

**Step 3 — Save the secret in admin app**
- store-admin → Settings → Payments → Edit keys
- Enter the same secret in the Webhook Secret field
- Save

**Step 4 — Verify**
Place a test order with online payment. After payment, check:
- Order status = `CONFIRMED`
- `Payment.razorpayPaymentId` is populated
- Backend logs show the webhook was received

---

## Files

| File | Role |
|---|---|
| `src/payments/payments.controller.ts` | Exposes `POST /api/payments/razorpay-webhook/:storeId` — public, no auth guard |
| `src/payments/payments.service.ts` | Verifies HMAC signature, processes `payment.captured` event |
| `src/payments/payments.module.ts` | Module wiring |
| `src/admin/payment-providers/payment-providers.service.ts` | `getWebhookSecret()` — decrypts and returns the stored secret |
| `src/main.ts` | `rawBody: true` — preserves raw request bytes for signature verification |
| `store-admin/.../settings/panels/payments.tsx` | UI to save webhook secret and display the webhook URL |
| `prisma/schema.prisma` | `StorePaymentProvider.webhookSecret String?` — encrypted storage |
