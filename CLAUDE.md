# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Implementation Plan

**Always read `implementation-plan.md` at the start of every session.** It is the source of truth for architecture decisions, build order, and what has been planned vs. what is yet to be built. Do not make architectural decisions that contradict it without discussing with the user first.

---

## Project Overview

WhatsApp Commerce is a multi-tenant platform that lets store owners sell products via WhatsApp conversations. Three apps share one backend:

| App | Port | Purpose |
|-----|------|---------|
| `backend-apis` | 3010 | Express + Prisma API server |
| `store-admin` | 3011 | Store owner management portal (Next.js) |
| `store-customer` | 3012 | Customer storefront, multi-tenant by domain (Next.js) |

---

## Running the Stack

### Backend
```bash
cd backend-apis
docker compose up -d          # Start PostgreSQL
npm run dev                   # Start API server with file watching
npx prisma migrate dev        # Run pending migrations
npx prisma studio             # Open DB GUI
node src/scripts/seed.js      # Seed database
```

### Frontend Apps
```bash
cd store-admin && npm run dev      # static port 3011, set in package.json
cd store-customer && npm run dev   # static port 3012, set in package.json
```

---

## Multi-Tenant Setup (store-customer)

The customer storefront resolves tenants by domain, not URL path. Each developer must add entries to `/etc/hosts` once:

```
127.0.0.1   freshmart.localhost
127.0.0.1   bakehouse.localhost
```

Then access `http://freshmart.localhost:3012`. The `Store.domain` field in the DB holds the value (`freshmart.localhost` in dev, `freshmart.com` in prod). The Next.js middleware forwards `X-Store-Domain` header to all API calls.

---

## Backend Architecture

### Conversation State Machine
The core of the platform. WhatsApp customers move through states managed in `ConversationSession.state`:

```
WELCOME → BROWSING_CATEGORIES → BROWSING_PRODUCTS → CART →
CHECKOUT_LOCATION → CHECKOUT_PAYMENT → ORDER_CONFIRMED / AWAITING_PAYMENT
```

State transitions and message handling live in `src/services/conversation.js`. Cart data is persisted as JSON in `ConversationSession.cartData`.

### Key Services
- `src/services/conversation.js` — state machine, incoming message routing
- `src/services/order.js` — order creation, status updates, daily stats
- `src/services/whatsapp.js` — sending text/interactive/catalog messages via Meta API

### Webhook Flow
All WhatsApp traffic enters via `POST /api/webhook`. The handler looks up the store by `whatsappPhoneNumberId`, then delegates to `conversationService.handleIncomingMessage`.

### Auth (not yet built)
JWT infrastructure is installed (`jsonwebtoken`, `bcryptjs`, `JWT_SECRET` in env) but auth routes and middleware don't exist yet. See `implementation-plan.md` Phase 2 for the plan.

---

## Database

Prisma ORM with PostgreSQL. Key relationships:
- `Store` is the tenant root — every other model has a `storeId`
- `Customer` is unique by `(phone, storeId)` — same phone can be a customer at multiple stores
- `Order.items` and `ConversationSession.cartData` are stored as JSON fields

```bash
# After any schema change
npx prisma migrate dev --name <description>
npx prisma generate
```

---

## Environment Variables

Copy `backend-apis/.env.example` → `backend-apis/.env`. Required for the webhook to work:
- `WHATSAPP_VERIFY_TOKEN` — must match what's set in Meta Developer Portal
- `WHATSAPP_PHONE_NUMBER_ID` — from Meta, used to look up the store on incoming messages
- `WHATSAPP_ACCESS_TOKEN` — Meta Cloud API token
