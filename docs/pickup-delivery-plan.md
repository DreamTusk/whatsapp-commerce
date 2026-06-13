# Pickup & Delivery Plan

## Overview

Store owners can enable pickup so customers can choose to collect their order from the store instead of getting it delivered.

---

## Phase 1 — Pickup (current scope)

### What it does
- Store owner enables pickup from store settings
- Customer sees a delivery type selector at checkout (only if store has pickup enabled)
- If Pickup selected — address form hidden, store address shown as pickup location
- If Delivery selected — normal address form (current behaviour)
- `delivery_type` saved on the order

### No time slots for now
Customer comes anytime. Time slots require store working hours + slot generation + capacity management — separate feature, build later.

---

## Schema Changes

### Store
```prisma
isPickupEnabled  Boolean  @default(false)  // store owner enables/disables pickup
```

### Order
```prisma
deliveryType  String  @default("DELIVERY")  // "DELIVERY" | "PICKUP"
```

---

## Checkout Flow

```
Checkout page loads
  └── Store has isPickupEnabled = true?
        ├── YES → show selector
        │         ◉ Door Delivery  → address form shown (current behaviour)
        │         ○ Pickup         → address form hidden
        │                            show store address as pickup location
        └── NO  → no selector shown, delivery only (nothing changes)
```

---

## What Gets Built

### Backend
| What | Where |
|------|-------|
| `isPickupEnabled` on `Store` | prisma migration |
| `deliveryType` on `Order` | same migration |
| `PUT /api/store` — accept `is_pickup_enabled` | admin store service |
| `GET /api/store` — return `is_pickup_enabled` | admin store service |
| `POST /api/storefront/orders` — accept `delivery_type`, skip address validation if PICKUP | storefront orders service |
| `GET /api/storefront/store` — return `is_pickup_enabled` + store address | storefront store service |

### store-admin
| What | Where |
|------|-------|
| Pickup toggle in store settings | settings page |

### store-customer
| What | Where |
|------|-------|
| Delivery type selector (shown only if `is_pickup_enabled`) | checkout-client.tsx |
| Hide address form when Pickup selected | checkout-client.tsx |
| Show store address as pickup info when Pickup selected | checkout-client.tsx |
| Pass `delivery_type` in order POST body | checkout-client.tsx |
| Show delivery type on order confirmation / tracking page | orders page |

### store-admin Orders
| What | Where |
|------|-------|
| Show delivery type badge on order list + order detail | admin orders page |

---

## API Changes

### POST /api/storefront/orders
```
New field: delivery_type  "DELIVERY" | "PICKUP"  (default: "DELIVERY")

If PICKUP:
  - address fields not required
  - address validation skipped
  - deliveryType = "PICKUP" saved on order

If DELIVERY:
  - address required (existing behaviour)
```

### GET /api/storefront/store
```
New fields in response:
  is_pickup_enabled: boolean
  address: string | null   // shown as pickup location
```

---

## Build Order

1. Schema migration (`isPickupEnabled` on Store, `deliveryType` on Order)
2. Admin store service — handle `is_pickup_enabled` on GET + PUT
3. Storefront orders service — handle `delivery_type`, skip address validation for PICKUP
4. Storefront store service — return `is_pickup_enabled` + address
5. store-admin settings — pickup toggle
6. store-customer checkout — delivery type selector + conditional address form
7. store-admin + store-customer order pages — show delivery type

---

## Future — Phase 2 (Time Slots)

When store working hours are built, add:
- `StoreWorkingHours` table — days + open/close times
- `PickupSlot` — generated from working hours, configurable duration (e.g. 1hr slots)
- `slotCapacity` — max orders per slot
- Customer picks a slot at checkout
- `pickupSlotId` on Order

Not in current scope.
