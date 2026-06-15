# Database Schema

PostgreSQL via Prisma ORM. `Store` is the tenant root — every other model carries a `storeId`.

---

## Table of Contents

- [Enums](#enums)
- [Store](#store)
- [User & Access](#user--access)
- [Customer](#customer)
- [Catalog](#catalog)
- [Cart & Wishlist](#cart--wishlist)
- [Orders & Payments](#orders--payments)
- [Banners & Media](#banners--media)
- [WhatsApp](#whatsapp)
- [Auth Tokens](#auth-tokens)

---

## Enums

### `OrderStatus`
| Value | Meaning |
|---|---|
| `NEW` | Order placed, not yet confirmed |
| `CONFIRMED` | Store confirmed the order |
| `OUT_FOR_DELIVERY` | Order out for delivery |
| `DELIVERED` | Delivered to customer |
| `CANCELLED` | Cancelled by customer or store |

### `OrderSource`
| Value | Meaning |
|---|---|
| `CUSTOMER` | Placed via storefront |
| `MANUAL` | Created manually by store owner |

### `PaymentMethod`
| Value | Meaning |
|---|---|
| `COD` | Cash on delivery |
| `ONLINE` | Online payment (Razorpay) |

### `PaymentStatus`
| Value | Meaning |
|---|---|
| `PENDING` | Not yet paid |
| `PAID` | Payment captured |
| `FAILED` | Payment failed |
| `REFUNDED` | Payment refunded |

### `CollectionType`
| Value | Meaning |
|---|---|
| `MANUAL` | Products added manually |
| `AUTO` | Products matched by criteria (JSON rules) |

### `BannerType`
| Value | Meaning |
|---|---|
| `PRODUCT` | Links to a product |
| `COLLECTION` | Links to a collection |
| `CATEGORY` | Links to a category |
| `URL` | Links to an external URL |

### `MediaEntity`
`PRODUCT` · `CATEGORY` · `BANNER` · `STORE` · `INVOICE` · `DOCUMENT`

### `MediaStatus`
`PENDING` · `ACTIVE`

### `BucketType`
`PUBLIC` · `PRIVATE`

### `Role`
`OWNER` · `STAFF`

---

## Store

### `Store`
The tenant root. Every other model traces back to a store.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `name` | `String` | Store display name |
| `phone` | `String` | Unique — used as login identity |
| `domain` | `String?` | Unique — tenant domain (`freshmart.localhost` in dev, `freshmart.com` in prod) |
| `logo` | `String?` | URL to store logo |
| `address` | `String?` | Store physical address |
| `minOrderAmount` | `Float` | Default `0` — blocks orders below this value |
| `deliveryRadius` | `Float?` | Delivery radius in km (optional) |
| `isActive` | `Boolean` | Default `true` |
| `isPickupEnabled` | `Boolean` | Default `false` |
| `isHomeDeliveryEnabled` | `Boolean` | Default `true` |
| `customerAuthMethods` | `String[]` | Default `["PHONE_OTP"]` |
| `whatsappPhoneNumberId` | `String?` | Unique — Meta phone number ID for webhook routing |
| `whatsappBusinessAccountId` | `String?` | Meta WABA ID |
| `whatsappAccessToken` | `String?` | Meta Cloud API token |
| `catalogId` | `String?` | Meta catalog ID |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

### `StorePaymentProvider`
Stores payment gateway credentials per store. Key secret is AES-encrypted at rest.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `provider` | `String` | `RAZORPAY` · `STRIPE` · `PAYU` |
| `keyId` | `String` | Public key / key ID |
| `keySecret` | `String` | Encrypted secret key |
| `isActive` | `Boolean` | Default `false` — must be explicitly activated |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Unique:** `(storeId, provider)` — one config per provider per store.

### `StoreInvite`
Invite tokens for adding staff/owners to a store.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `email` | `String` | Invited email |
| `role` | `Role` | `OWNER` or `STAFF` |
| `token` | `String` | Unique random token sent in invite email |
| `isUsed` | `Boolean` | Default `false` |
| `expiresAt` | `DateTime` | |
| `createdAt` | `DateTime` | |

**Unique:** `(email, storeId)` — one active invite per email per store.

---

## User & Access

### `User`
Store admin/staff accounts. Separate from `Customer`.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `name` | `String` | |
| `email` | `String` | Unique |
| `password` | `String` | bcrypt hash |
| `isVerified` | `Boolean` | Default `false` — email verification |
| `createdAt` | `DateTime` | |

### `UserStore`
Many-to-many join between `User` and `Store`. A user can belong to multiple stores with different roles.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `userId` | `String` | FK → User |
| `storeId` | `String` | FK → Store |
| `role` | `Role` | `OWNER` or `STAFF` |
| `isActive` | `Boolean` | Default `true` |
| `createdAt` | `DateTime` | |

**Unique:** `(userId, storeId)`

### `OtpVerification`
OTPs for admin user email verification.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `userId` | `String` | FK → User |
| `otp` | `String` | |
| `isUsed` | `Boolean` | Default `false` |
| `expiresAt` | `DateTime` | |
| `createdAt` | `DateTime` | |

### `RefreshToken`
JWT refresh tokens for admin users.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `token` | `String` | Unique |
| `userId` | `String` | FK → User |
| `isRevoked` | `Boolean` | Default `false` |
| `expiresAt` | `DateTime` | |
| `createdAt` | `DateTime` | |

**How admin access token and refresh token flow works:**

Admin users (store owners and staff) log in with email and password. Every login issues two tokens — a short-lived access token for API calls and a long-lived refresh token to obtain new access tokens without logging in again.

**Login:**
1. User submits email + password → backend verifies bcrypt hash and checks `user.isVerified = true`
2. A JWT access token is signed with `JWT_SECRET`, expiry **40 minutes**, payload: `{ userId }`
3. A refresh token is generated — a random 128-character hex string (opaque, not a JWT) — stored in the `RefreshToken` table with a 21-day expiry
4. Both tokens are returned to the client

**Per-request validation (access token):**
Every protected admin route runs the `JwtStrategy`:
1. Verify JWT signature and expiry against `JWT_SECRET`
2. Extract `userId` from the payload
3. Look up the user and confirm `isVerified = true`
4. Reject if unverified — this blocks accounts that were created but never verified their email

**When the access token expires (after 40 min):**
Client calls `POST /api/auth/refresh` with the refresh token:
1. Backend looks up the refresh token row — rejects if missing, revoked, or expired
2. Issues a new access token (40 min)
3. The **same refresh token is reused** — it is not rotated

**Logout:**
Marks the specific `RefreshToken` row as `isRevoked = true`. The access token remains technically valid until its 40-minute window closes, but the client discards it so there is no practical risk.

**Password reset:**
Revokes **all** refresh tokens for the user in a single `updateMany`. Every device the user was logged in on will be forced to re-authenticate once their current access token expires.

```
Email + password verified
        ↓
access_token (JWT, 40 min) + refresh_token (opaque hex, 21 days, stored in DB)
        ↓                              ↓
Every API call                 When access_token expires
Authorization: Bearer          POST /api/auth/refresh
        ↓                              ↓
Verify JWT sig + expiry        Look up token in DB → not revoked, not expired
Check user.isVerified = true           ↓
                               Issue new access_token (40 min)
                               (same refresh_token reused)
        ↓
Logout: RefreshToken.isRevoked = true → no new access tokens can be issued
```

---

## Customer

### `Customer`
Storefront shoppers. A phone number can be a customer at multiple stores — uniqueness is `(phone, storeId)`.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `phone` | `String?` | Primary identity for phone OTP auth |
| `email` | `String?` | Optional |
| `name` | `String?` | Optional — filled in at checkout |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Unique:** `(phone, storeId)`

### `CustomerAddress`
Saved delivery addresses for a customer at a store.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `customerId` | `String` | FK → Customer |
| `storeId` | `String` | FK → Store |
| `label` | `String?` | e.g. "Home", "Office" |
| `address` | `String?` | Full address line |
| `doorNo` | `String?` | |
| `street` | `String?` | |
| `city` | `String?` | |
| `state` | `String?` | |
| `country` | `String?` | |
| `pincode` | `String?` | |
| `latitude` | `Float?` | |
| `longitude` | `Float?` | |
| `isDefault` | `Boolean` | Default `false` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

### `CustomerOtp`
OTPs for customer phone login.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `phone` | `String` | |
| `storeId` | `String` | FK → Store |
| `otp` | `String` | |
| `isUsed` | `Boolean` | Default `false` |
| `expiresAt` | `DateTime` | |
| `createdAt` | `DateTime` | |

### `CustomerToken`
JWT token revocation list for customer sessions. Tracks `jti` (JWT ID) so individual tokens can be revoked.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `jti` | `String` | Unique — JWT ID claim |
| `customerId` | `String` | FK → Customer |
| `isRevoked` | `Boolean` | Default `false` |
| `expiresAt` | `DateTime` | |
| `createdAt` | `DateTime` | |

**How customer token flow works:**

Customers log in via phone OTP — there is no password. Each successful OTP verification issues a single JWT that lasts 30 days.

**Login:**
1. Customer sends phone number → OTP sent via SMS (stored in `CustomerOtp`, expires in 10 min)
2. Customer sends phone + OTP → backend verifies it, marks OTP as used
3. Customer row is upserted by `(phone, storeId)` — first login creates the account automatically
4. Backend generates a `jti` (random UUID) and creates a `CustomerToken` row with `isRevoked: false`
5. A JWT is signed with `CUSTOMER_JWT_SECRET`, expiry **30 days**, carrying `{ customerId, storeId, phone, jti }` in the payload
6. Only the JWT is returned — there is no separate refresh token

**Per-request validation:**
Every protected storefront route runs the `CustomerJwtStrategy`:
1. Verify JWT signature and expiry against `CUSTOMER_JWT_SECRET`
2. Extract `jti` from the payload
3. Look up the `CustomerToken` row by `jti`
4. Reject if the row is missing or `isRevoked = true`

This DB check on every request is what makes instant logout possible — the JWT stays cryptographically valid for 30 days, but revoking the `jti` row cuts it off immediately.

**Logout:**
Backend sets `CustomerToken.isRevoked = true` for the row matching the `jti` from the token. No token needs to be sent by the client beyond the usual Bearer header — `jti` is already embedded in it.

**Re-authentication:**
When the token expires after 30 days, the customer goes through the phone OTP flow again. A new `jti` and a new `CustomerToken` row are created for the new session.

```
Phone OTP verified
      ↓
jti generated → CustomerToken row created (isRevoked: false)
      ↓
JWT issued  { customerId, storeId, phone, jti }  — 30 days
      ↓
Every API call: verify JWT sig → look up jti → isRevoked = false? → allow
      ↓
Logout: CustomerToken.isRevoked = true → all future requests rejected instantly
```

---

## Catalog

### `Category`
Product categories. Supports one level of nesting via self-relation (`parentId`).

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `name` | `String` | |
| `imageUrl` | `String?` | |
| `isActive` | `Boolean` | Default `true` |
| `parentId` | `String?` | FK → Category (self) — for subcategories |
| `createdAt` | `DateTime` | |

### `Brand`
Product brands per store.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `name` | `String` | |
| `createdAt` | `DateTime` | |

**Unique:** `(name, storeId)`

### `Product`
The core catalog item.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `categoryId` | `String` | FK → Category (required) |
| `brandId` | `String?` | FK → Brand (optional) |
| `name` | `String` | |
| `description` | `String?` | |
| `sellingPrice` | `Float` | Default `0` — price used at order time |
| `originalPrice` | `Float?` | MRP / strike-through price |
| `unit` | `String?` | e.g. "500g", "1 litre" |
| `isActive` | `Boolean` | Default `true` |
| `inStock` | `Boolean` | Default `true` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

### `ProductMedia`
Join table linking products to media files. A product can have multiple images; one is marked primary.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `productId` | `String` | FK → Product (cascade delete) |
| `mediaId` | `String` | FK → Media (cascade delete) |
| `isPrimary` | `Boolean` | Default `false` |
| `sortOrder` | `Int` | Default `0` |
| `createdAt` | `DateTime` | |

**Unique:** `(productId, mediaId)`

### `Collection`
Curated or rule-based product groups (shown on storefront as sections).

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `name` | `String` | |
| `type` | `CollectionType` | `MANUAL` or `AUTO` |
| `criteria` | `Json?` | Rules for AUTO collections |
| `isActive` | `Boolean` | Default `true` |
| `displayOrder` | `Int` | Default `0` — sort order on storefront |
| `imageUrl` | `String?` | |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

### `CollectionProduct`
Join table for MANUAL collections.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `collectionId` | `String` | FK → Collection (cascade delete) |
| `productId` | `String` | FK → Product |
| `position` | `Int` | Default `0` — display order within collection |
| `addedAt` | `DateTime` | |

**Unique:** `(collectionId, productId)`

---

## Cart & Wishlist

### `CartItem`
One row per product in a customer's active cart. Cart is per `(customer, store)`.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `customerId` | `String` | FK → Customer |
| `productId` | `String` | FK → Product |
| `storeId` | `String` | FK → Store |
| `quantity` | `Int` | Default `1` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Unique:** `(customerId, productId)` — one row per product per customer.

### `WishlistItem`
Saved products for a customer at a store.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `customerId` | `String` | FK → Customer |
| `productId` | `String` | FK → Product |
| `storeId` | `String` | FK → Store |
| `createdAt` | `DateTime` | |

**Unique:** `(customerId, productId)`

---

## Orders & Payments

### `Order`
One order per checkout. Delivery address fields are snapshotted at order time (not linked to `CustomerAddress`).

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `customerId` | `String` | FK → Customer |
| `orderNumber` | `String` | Human-readable, store-scoped (e.g. `ORD-001`) |
| `totalAmount` | `Float` | Sum of all item subtotals |
| `status` | `OrderStatus` | Default `NEW` |
| `source` | `OrderSource` | Default `CUSTOMER` |
| `createdBy` | `String?` | Customer name/phone snapshot at order time |
| `deliveryType` | `String` | `HOME_DELIVERY` or `PICKUP` — default `HOME_DELIVERY` |
| `expectedPickupTime` | `DateTime?` | For PICKUP orders |
| `deliveryNotes` | `String?` | Customer delivery instructions |
| `address` | `String?` | Full address line snapshot |
| `doorNo` | `String?` | |
| `street` | `String?` | |
| `city` | `String?` | |
| `state` | `String?` | |
| `country` | `String?` | |
| `pincode` | `String?` | |
| `latitude` | `Float?` | |
| `longitude` | `Float?` | |
| `altPhone` | `String?` | Alternate contact number |
| `notes` | `String?` | General order notes |
| `cancellationReason` | `String?` | |
| `cancelledBy` | `String?` | `"CUSTOMER"` or `"STORE"` |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Unique:** `(storeId, orderNumber)`

### `OrderItem`
Line items snapshotted at order time. Price and name are copied from the product so historical orders aren't affected by catalog changes.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `orderId` | `String` | FK → Order |
| `productId` | `String` | FK → Product |
| `productName` | `String` | Snapshot of product name |
| `price` | `Float` | Snapshot of `sellingPrice` at order time |
| `quantity` | `Int` | |
| `subtotal` | `Float` | `price × quantity` |

### `Payment`
One-to-one with `Order`. Created alongside the order with `status: PENDING`.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `orderId` | `String` | Unique FK → Order |
| `method` | `PaymentMethod` | `COD` or `ONLINE` |
| `status` | `PaymentStatus` | Default `PENDING` |
| `razorpayOrderId` | `String?` | Razorpay `order_id` — set when Razorpay order is created |
| `razorpayPaymentId` | `String?` | Razorpay `payment_id` — set after successful capture |
| `paidAt` | `DateTime?` | Timestamp of payment capture |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

---

## Banners & Media

### `Banner`
Promotional banners on the storefront. Each banner links to one destination (product, collection, category, or URL).

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `name` | `String` | Internal name |
| `type` | `BannerType` | Determines which FK is used |
| `imageUrl` | `String?` | Banner image |
| `isActive` | `Boolean` | Default `true` |
| `displayOrder` | `Int` | Default `0` |
| `productId` | `String?` | FK → Product (when type = PRODUCT) |
| `collectionId` | `String?` | FK → Collection (when type = COLLECTION) |
| `categoryId` | `String?` | FK → Category (when type = CATEGORY) |
| `url` | `String?` | External URL (when type = URL) |
| `startsAt` | `DateTime?` | Scheduled start |
| `expiresAt` | `DateTime?` | Scheduled expiry |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**Index:** `storeId`

### `Media`
File metadata for uploaded assets. Actual files live on local disk (`/uploads`) or R2.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | FK → Store |
| `key` | `String` | Unique storage key / path |
| `bucket` | `BucketType` | `PUBLIC` or `PRIVATE` |
| `url` | `String?` | Public URL |
| `mimeType` | `String` | e.g. `image/jpeg` |
| `size` | `Int` | File size in bytes |
| `originalName` | `String` | Original filename |
| `entityType` | `MediaEntity` | What this media belongs to |
| `entityId` | `String?` | ID of the linked entity |
| `status` | `MediaStatus` | Default `PENDING` |
| `thumbnailKey` | `String?` | Storage key for thumbnail |
| `thumbnailUrl` | `String?` | Public URL for thumbnail |
| `uploadedBy` | `String?` | FK → User |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

---

## WhatsApp

### `ConversationSession`
Tracks the state machine position for WhatsApp customers. Cart data is stored as JSON until the customer places an order.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `customerId` | `String` | FK → Customer |
| `storeId` | `String` | FK → Store (denormalised for fast lookup) |
| `state` | `String` | Current state machine state — default `"WELCOME"` |
| `cartData` | `Json` | In-conversation cart — default `[]` |
| `expiresAt` | `DateTime` | Session TTL |
| `createdAt` | `DateTime` | |
| `updatedAt` | `DateTime` | |

**State machine:** `WELCOME → BROWSING_CATEGORIES → BROWSING_PRODUCTS → CART → CHECKOUT_LOCATION → CHECKOUT_PAYMENT → ORDER_CONFIRMED / AWAITING_PAYMENT`

### `MessageLog`
Raw log of inbound and outbound WhatsApp messages for debugging.

| Column | Type | Notes |
|---|---|---|
| `id` | `String` | CUID primary key |
| `storeId` | `String` | |
| `customerPhone` | `String` | |
| `direction` | `String` | `"inbound"` or `"outbound"` |
| `messageType` | `String` | WhatsApp message type |
| `content` | `Json` | Full message payload |
| `whatsappMsgId` | `String?` | Meta message ID |
| `createdAt` | `DateTime` | |

---

## Auth Tokens

| Model | Used by | Purpose |
|---|---|---|
| `RefreshToken` | Admin users | JWT refresh token rotation |
| `OtpVerification` | Admin users | Email OTP for account verification |
| `CustomerToken` | Customers | JWT revocation via `jti` tracking |
| `CustomerOtp` | Customers | Phone OTP for storefront login |
