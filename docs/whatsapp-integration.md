# WhatsApp Integration — Implementation Plan

---

## Part 1 — Schema Changes

### 1.1 Remove WhatsApp fields from Store

Remove these three fields from the `Store` model (no migration needed — no store has these set yet):

```prisma
// Remove from Store:
whatsappPhoneNumberId      String?
whatsappBusinessAccountId  String?
whatsappAccessToken        String?
```

### 1.2 Add StoreWhatsappNumber table

```prisma
model StoreWhatsappNumber {
  id            String                @id @default(cuid())
  storeId       String
  phoneNumberId String                // Meta Phone Number ID
  accessToken   String                // Meta system user token
  phone         String                // E.164 format e.g. +919876543210
  purpose       WhatsappNumberPurpose
  label         String?               // display name e.g. "Order Updates"
  isActive      Boolean               @default(true)
  createdAt     DateTime              @default(now())

  Store         Store                 @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@unique([storeId, purpose])
}

enum WhatsappNumberPurpose {
  ORDER_MANAGEMENT
  MARKETING
}
```

### 1.3 Add marketing opt-in to Customer

```prisma
model Customer {
  // existing fields ...
  marketingOptIn  Boolean   @default(false)
  optedInAt       DateTime?
}
```

### 1.4 Add Campaign table

```prisma
model Campaign {
  id           String         @id @default(cuid())
  storeId      String
  title        String
  templateName String
  variables    Json           // string array e.g. ["Get 20% off", "Sunday midnight"]
  status       CampaignStatus @default(DRAFT)
  scheduledAt  DateTime?
  sentAt       DateTime?
  totalSent    Int            @default(0)
  totalFailed  Int            @default(0)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  Store        Store          @relation(fields: [storeId], references: [id], onDelete: Cascade)
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  FAILED
}
```

### Migration

```bash
npx prisma migrate dev --name whatsapp-numbers-and-campaigns
npx prisma generate
```

---

## Part 2 — WhatsApp Service

**File:** `src/shared/whatsapp.service.ts`

This is the single service that handles all WhatsApp API calls. Every flow uses this.

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappNumberPurpose } from '@prisma/client';
import axios from 'axios';

interface SendTemplateOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  variables: string[];
}

@Injectable()
export class WhatsAppService {
  private readonly baseUrl = 'https://graph.facebook.com/v20.0';

  constructor(private prisma: PrismaService) {}

  // Fetch the active WhatsApp number for a store by purpose
  async getNumber(storeId: string, purpose: WhatsappNumberPurpose) {
    return this.prisma.storeWhatsappNumber.findFirst({
      where: { storeId, purpose, isActive: true },
    });
  }

  // Send a pre-approved template message
  async sendTemplate(opts: SendTemplateOptions): Promise<void> {
    const { phoneNumberId, accessToken, to, templateName, variables } = opts;

    await axios.post(
      `${this.baseUrl}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: variables.length > 0 ? [{
            type: 'body',
            parameters: variables.map(text => ({ type: 'text', text })),
          }] : [],
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  }
}
```

Register in `SharedModule` and export.

---

## Part 3 — WhatsApp Numbers API

Endpoints for store admin to connect and manage their WhatsApp numbers.

**File:** `src/admin/whatsapp/whatsapp.controller.ts`

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/whatsapp-numbers` | List connected numbers for the store |
| POST | `/api/whatsapp-numbers` | Connect a new number |
| PUT | `/api/whatsapp-numbers/:id` | Update label or toggle active |
| DELETE | `/api/whatsapp-numbers/:id` | Remove a number |

### GET `/api/whatsapp-numbers`

```
Headers:  Authorization: Bearer <adminToken>

Response:
{
  "whatsapp_numbers": [
    {
      "id": "clx...",
      "phone": "+919876500001",
      "phone_number_id": "123456789012345",
      "purpose": "ORDER_MANAGEMENT",
      "label": "Order Updates",
      "is_active": true,
      "created_at": "2026-06-22T..."
    },
    {
      "id": "cly...",
      "phone": "+919876500002",
      "phone_number_id": "987654321098765",
      "purpose": "MARKETING",
      "label": "Offers & Deals",
      "is_active": true,
      "created_at": "2026-06-22T..."
    }
  ]
}
```

### POST `/api/whatsapp-numbers`

```
Headers:  Authorization: Bearer <adminToken>
Request:
{
  "phone_number_id": "123456789012345",
  "access_token": "EAAxxxxx...",
  "phone": "+919876500001",
  "purpose": "ORDER_MANAGEMENT",     // ORDER_MANAGEMENT or MARKETING
  "label": "Order Updates"           // optional
}

Response: { "whatsapp_number": { ...fields } }

Errors:
  400 — phone_number_id, access_token, phone, purpose are required
  400 — invalid purpose
  400 — phone not in E.164 format
  409 — a number with this purpose already exists for this store
```

### PUT `/api/whatsapp-numbers/:id`

```
Request:  { "label": "New Label", "is_active": false }   // all optional
Response: { "whatsapp_number": { ...fields } }
Errors:   404 — not found or does not belong to this store
```

### DELETE `/api/whatsapp-numbers/:id`

```
Response: { "message": "WhatsApp number removed" }
Errors:   404 — not found or does not belong to this store
```

---

## Part 4 — Order Management Flow

No new endpoints needed. Changes go inside existing services.

### 4.1 Flow: Customer orders → Owner gets alert

**File:** `src/storefront/orders/orders.service.ts`

Inject `WhatsAppService`. After order is created and cart is cleared, add:

```ts
private async notifyOwner(storeId: string, store: any, order: any, customerPhone: string | null): Promise<void> {
  const waNumber = await this.whatsapp.getNumber(storeId, 'ORDER_MANAGEMENT');
  if (!waNumber || !store.phone) return;

  await this.whatsapp.sendTemplate({
    phoneNumberId: waNumber.phoneNumberId,
    accessToken: waNumber.accessToken,
    to: store.phone,                        // owner's personal number
    templateName: 'new_order_owner_alert',
    variables: [
      order.orderNumber,
      order.Customer?.name ?? 'Customer',
      customerPhone ?? '-',
      `Rs.${order.totalAmount}`,
      String(order.OrderItem.length),
    ],
  });
}

// Call in placeOrder() after cart clear:
this.notifyOwner(storeId, store, order, customerRecord?.phone ?? null).catch(() => {});
```

### 4.2 Flow: Owner updates status → Customer gets notified

**File:** `src/admin/orders/orders.service.ts`

Inject `WhatsAppService`. Replace the existing `console.log` stub in `notifyCustomer()`:

```ts
private async notifyCustomer(
  storeId: string,
  customerPhone: string | null,
  orderNumber: string,
  status: OrderStatus,
  cancellationReason?: string,
): Promise<void> {
  if (!customerPhone) return;

  const waNumber = await this.whatsapp.getNumber(storeId, 'ORDER_MANAGEMENT');
  if (!waNumber) return;

  const store = await this.prisma.store.findUnique({ where: { id: storeId } });

  const templateMap: Partial<Record<OrderStatus, { name: string; variables: string[] }>> = {
    [OrderStatus.CONFIRMED]: {
      name: 'order_confirmed',
      variables: [orderNumber],
    },
    [OrderStatus.OUT_FOR_DELIVERY]: {
      name: 'order_out_for_delivery',
      variables: [orderNumber],
    },
    [OrderStatus.DELIVERED]: {
      name: 'order_delivered',
      variables: [orderNumber],
    },
    [OrderStatus.CANCELLED]: {
      name: 'order_cancelled',
      variables: [orderNumber, cancellationReason ?? 'No reason provided', store?.phone ?? '-'],
    },
  };

  const tpl = templateMap[status];
  if (!tpl) return;

  await this.whatsapp.sendTemplate({
    phoneNumberId: waNumber.phoneNumberId,
    accessToken: waNumber.accessToken,
    to: customerPhone,
    templateName: tpl.name,
    variables: tpl.variables,
  });
}
```

The fire-and-forget calls at the bottom of `updateOrderStatus()` and `addShipment()` stay as they are.

---

## Part 5 — Customer Opt-in

### 5.1 Storefront — Checkout page

Add a checkbox on the checkout form:

```
☐  Send me offers and updates on WhatsApp
```

This maps to a `marketing_opt_in: boolean` field in the place order request body.

### 5.2 Backend — Save opt-in on order placement

**File:** `src/storefront/orders/orders.service.ts`

In `placeOrder()`, after the customer record is resolved, update opt-in status if provided:

```ts
if (typeof body.marketing_opt_in === 'boolean') {
  await this.prisma.customer.update({
    where: { id: customerId },
    data: {
      marketingOptIn: body.marketing_opt_in,
      optedInAt: body.marketing_opt_in ? new Date() : null,
    },
  });
}
```

### 5.3 storefront orders API update

Add `marketing_opt_in` as an optional boolean field to `POST /api/storefront/orders` request body.

---

## Part 6 — Campaigns API

### Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/campaigns` | List all campaigns for the store |
| POST | `/api/campaigns` | Create a new campaign |
| GET | `/api/campaigns/:id` | Get campaign details |
| PUT | `/api/campaigns/:id` | Update a DRAFT campaign |
| POST | `/api/campaigns/:id/send` | Send or schedule the campaign |
| DELETE | `/api/campaigns/:id` | Delete a DRAFT campaign |

**File:** `src/admin/campaigns/campaigns.controller.ts`

### POST `/api/campaigns` — Create campaign

```
Request:
{
  "title": "Weekend Sale June",
  "template_name": "general_offer",
  "variables": ["Get 20% off all vegetables!", "Sunday midnight"],
  "scheduled_at": "2026-06-28T06:00:00.000Z"   // optional, null = send immediately on /send
}

Response: { "campaign": { "id", "title", "status": "DRAFT", ... } }

Errors:
  400 — title, template_name, variables are required
  400 — no marketing WhatsApp number connected for this store
```

### POST `/api/campaigns/:id/send` — Send campaign

This is where the actual broadcast happens.

```
Response: { "campaign": { "status": "SENDING", ... } }

What happens in the background:
  1. Fetch all customers where marketingOptIn = true and storeId matches
  2. Get the MARKETING WhatsApp number for this store
  3. For each opted-in customer:
       - Send MARKETING template with filled variables to customer.phone
       - Increment totalSent on success
       - Increment totalFailed on error
  4. Update campaign status to SENT, set sentAt = now
```

> Run this as a background job, not inside the request handler, since it can take time for large customer lists.

### GET `/api/campaigns` — List campaigns

```
Response:
{
  "campaigns": [
    {
      "id": "clx...",
      "title": "Weekend Sale June",
      "template_name": "general_offer",
      "status": "SENT",
      "total_sent": 142,
      "total_failed": 3,
      "sent_at": "2026-06-22T10:00:00.000Z",
      "created_at": "2026-06-21T..."
    }
  ]
}
```

---

## Part 7 — Message Templates (Register in Meta)

All templates go under your Meta Business Manager → Account Tools → Message Templates.

### Order Management templates (Category: UTILITY)

**`new_order_owner_alert`**
```
🛒 *New Order Received*

Order {{1}}
Customer: {{2}}
Phone: {{3}}
Amount: {{4}}
Items: {{5}}
```

**`order_confirmed`**
```
✅ *Order Confirmed!*

Your order {{1}} is confirmed. We're getting it ready for you now.
```

**`order_out_for_delivery`**
```
🛵 *On the way!*

Your order {{1}} is out for delivery. Expect it in 30–45 minutes.
```

**`order_delivered`**
```
🎉 *Delivered!*

Order {{1}} has been delivered. Thank you for shopping with us!
```

**`order_cancelled`**
```
❌ *Order Cancelled*

Order {{1}} has been cancelled.
Reason: {{2}}

Questions? Call us: {{3}}
```

### Marketing templates (Category: MARKETING)

**`general_offer`**
```
Hi {{1}},

{{2}}

Valid till {{3}}.

Shop now 🛒
```

**`new_arrival`**
```
Hi {{1}},

{{2}} is now available at our store!

{{3}}

Shop now 🛒
```

**`re_engagement`**
```
Hi {{1}}, we miss you! 👋

It's been a while since your last order. Here's something special for you:

{{2}}

Valid till {{3}}.
```

---

## Part 8 — Admin UI

### Settings → WhatsApp tab

```
WhatsApp Numbers

Order Management                                        [Active]
+91 98765 00001 · ID: 123456789012345
Sends order alerts to you and status updates to customers
                                             [Edit]  [Remove]

Marketing                                           [Not connected]
Send promotional offers to opted-in customers
                                                    [+ Connect]
```

Clicking **Connect** opens a modal with fields:
- Phone Number ID (from Meta)
- Access Token
- Phone number (E.164)
- Label (optional)

### Dashboard → Campaigns page

```
Campaigns                                      [+ New Campaign]

Weekend Sale June     SENT    142 sent · 3 failed    22 Jun 10:00
Mango Season Offer    SENT     98 sent · 0 failed    15 Jun 09:00
Re-engagement July    DRAFT                           —
```

New Campaign modal:
- Title
- Template (dropdown of approved marketing templates)
- Fill variables (dynamic fields based on template)
- Send now / Schedule (date + time picker)

---

## Part 9 — Build Order

### Phase 1 — Order notifications (build first)

- [ ] Run migration for `StoreWhatsappNumber` table (remove old fields, add new table)
- [ ] Create `WhatsAppService` in `src/shared/`
- [ ] Register WhatsApp numbers API (`/api/whatsapp-numbers`)
- [ ] Add `notifyOwner()` in `StorefrontOrdersService`
- [ ] Replace `console.log` stub in `AdminOrdersService.notifyCustomer()`
- [ ] Register 5 UTILITY templates in Meta
- [ ] Add WhatsApp tab in store-admin Settings page
- [ ] Test end to end with real phone numbers

### Phase 2 — Marketing campaigns (after Phase 1 is live)

- [ ] Run migration for `Campaign` table and `Customer.marketingOptIn`
- [ ] Add `marketing_opt_in` field to storefront place-order API
- [ ] Add opt-in checkbox to checkout page in store-customer
- [ ] Build Campaigns API (`/api/campaigns`)
- [ ] Background job for sending campaigns
- [ ] Register 3 MARKETING templates in Meta
- [ ] Build Campaigns page in store-admin
- [ ] Test campaign send with opted-in customers
