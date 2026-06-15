# Pending Integrations

These are intentionally stubbed with console output during development. Each has a defined interface — swapping in the real provider requires **no route changes**, only updating the service file.

---

## 1. Image Storage — Local → Cloudinary / S3

**Status:** Console stub (saves to local filesystem)
**File:** `backend-apis/src/external-services/storage.ts`

**Current behaviour:** Images saved to `uploads/{folder}/{uuid}.jpg` on local disk. Served via `GET /uploads/*` (Express static).

**Interface (stable — do not change when swapping):**
```ts
uploadImage(buffer: Buffer, folder: string): Promise<string>  // returns path/URL
deleteImage(path: string): Promise<void>
```

**To integrate:**
- Replace file body with Cloudinary or AWS S3 SDK calls
- Return the CDN URL instead of a local path
- Remove `express.static('/uploads')` from `app.ts`
- Add `CLOUDINARY_URL` or `AWS_*` keys to `.env`

---

## 2. Email — Console → Zepto Mail

**Status:** Console stub (OTPs and notifications printed to server console)
**File:** `backend-apis/src/workers/email.ts`

**Current behaviour:** `console.log` prints email recipient, subject, and body.

**Interface (stable):**
```ts
sendSimpleEmail(to: string, subject: string, body: string): Promise<void>
```

**To integrate:**
- Add Zepto Mail SMTP credentials to `.env`:
  ```
  ZEPTO_MAIL_HOST=smtp.zeptomail.in
  ZEPTO_MAIL_PORT=587
  ZEPTO_MAIL_USER=...
  ZEPTO_MAIL_PASS=...
  ZEPTO_MAIL_FROM=noreply@yourdomain.com
  ```
- Replace `console.log` body with nodemailer + Zepto Mail transport

---

## 3. Phone OTP — Console → SMS / WhatsApp Provider

**Status:** Console stub (OTP printed to server console, no real SMS sent)
**File:** `backend-apis/src/workers/sms.ts` *(to be created alongside CustomerOtp implementation)*

**Current behaviour:** OTP generated and logged to console only.

**Interface (stable — define now, implement later):**
```ts
sendOtp(phone: string, otp: string): Promise<void>
```

**Options when ready:**

| Provider | Notes |
|----------|-------|
| **WhatsApp Business API** | Best fit — customers are already on WhatsApp, consistent with product identity. Uses existing Meta integration. |
| **MSG91** | India-focused SMS, competitive pricing |
| **Twilio SMS** | Standard SMS, global coverage |

**Recommended:** WhatsApp OTP via the existing WhatsApp Business API — send a template message with the OTP code. No new vendor needed.

**To integrate:**
- Add OTP message template in Meta Business Manager
- Call `whatsappService.sendTemplateMessage(phone, templateName, [otp])` in `sms.ts`
- Add `WHATSAPP_OTP_TEMPLATE_NAME` to `.env`

---

## 4. Payments — COD only → Razorpay Online

**Status:** COD only. `Payment.razorpayOrderId` and `razorpayPaymentId` fields exist but unused.
**File:** `backend-apis/src/routes/storefront/orders.ts` *(to be created)*

**To integrate:**
- On `POST /api/storefront/orders` with `payment_method: "ONLINE"`:
  - Create Razorpay payment link via Razorpay SDK
  - Save `razorpayOrderId` to `Payment` table
  - Return `payment_url` in response — frontend redirects customer
- Add `POST /api/razorpay/webhook` route:
  - Verify Razorpay webhook signature
  - On `payment.captured` event → set `Payment.status = "PAID"`, `paidAt = now()`
  - Trigger order confirmation notification
- Add to `.env`:
  ```
  RAZORPAY_KEY_ID=...
  RAZORPAY_KEY_SECRET=...
  RAZORPAY_WEBHOOK_SECRET=...
  ```

---

## 5. Order Status Notifications — Console → WhatsApp Business API

**Status:** Console stub (messages printed to server console via `logger.info`)
**File:** `backend-apis/src/routes/admin/orders.ts` — `notifyCustomer()` function

**Current behaviour:** When admin advances or cancels an order, the message that would be sent to the customer is logged to the server console.

**Messages defined (stable — no changes needed when integrating):**

| Status | Message |
|--------|---------|
| `CONFIRMED` | ✅ Your order *ORD-0001* from *Store* has been confirmed! |
| `OUT_FOR_DELIVERY` | 🛵 Your order *ORD-0001* is on its way! |
| `DELIVERED` | 🎉 Your order *ORD-0001* has been delivered. Thank you! |
| `CANCELLED` | ❌ Your order *ORD-0001* has been cancelled. Reason: … Contact: store phone |

**To integrate:**
- In `notifyCustomer()`, replace the `logger.info` call with:
  ```ts
  await whatsappService.sendTextMessage(store, customerPhone, message)
  ```
- Wrap in try/catch (already fire-and-forget, won't block the response)
- Requires store to have `whatsappPhoneNumberId` and `whatsappAccessToken` configured

**Note:** The WhatsApp service (`src/services/whatsapp.ts`) is already fully implemented. This is just a matter of uncommenting the call once WhatsApp Business API credentials are set up in the store settings.

---

## Summary

| Integration | File to update | Env vars needed |
|-------------|---------------|-----------------|
| Image storage | `storage.ts` | `CLOUDINARY_URL` or `AWS_*` |
| Email | `email.ts` | `ZEPTO_MAIL_*` |
| Phone OTP | `sms.ts` | `WHATSAPP_OTP_TEMPLATE_NAME` (or SMS provider keys) |
| Razorpay | `orders.ts` + new `razorpay.ts` route | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Order notifications | `admin/orders.ts` — `notifyCustomer()` | WhatsApp credentials on Store record |
