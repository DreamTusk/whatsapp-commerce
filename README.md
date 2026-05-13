# WhatsApp Commerce Platform

A standalone WhatsApp-based ordering platform for local businesses. Customers can browse products, add to cart, checkout, and pay - all inside WhatsApp.

## Sprint 1 - Complete ✅

Backend infrastructure with WhatsApp webhook integration, conversation state machine, and order management.

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL + Prisma ORM
- **WhatsApp:** Meta Cloud API
- **Payments:** Razorpay (to be integrated)

## Features Implemented

- ✅ WhatsApp webhook server (verification + message handling)
- ✅ Conversation state machine with 8 states
- ✅ Interactive list messages for browsing
- ✅ Interactive button messages for actions
- ✅ Cart management
- ✅ Location-based checkout
- ✅ COD payment support
- ✅ Order creation and tracking
- ✅ Message logging
- ✅ Database schema with all models

## Project Structure

```
whatsapp-commerce/
├── src/
│   ├── routes/
│   │   └── webhook.js          # WhatsApp webhook endpoints
│   ├── services/
│   │   ├── whatsapp.js         # WhatsApp message sending
│   │   ├── conversation.js     # State machine logic
│   │   └── order.js            # Order management
│   ├── utils/
│   │   ├── db.js               # Prisma client
│   │   └── logger.js           # Logging utility
│   ├── scripts/
│   │   └── seed.js             # Database seeding
│   └── index.js                # Express server
├── prisma/
│   └── schema.prisma           # Database schema
├── .env.example                # Environment variables template
└── package.json
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Meta WhatsApp Business Account (for testing)

### 2. Clone and Install

```bash
git clone <repo-url>
cd whatsapp-commerce
npm install
```

### 3. Database Setup

Create a PostgreSQL database:

```bash
createdb whatsapp_commerce
```

### 4. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_commerce

# Get these from Meta Developer Dashboard
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

### 5. Run Migrations

```bash
npx prisma migrate dev --name init
```

### 6. Seed Database

```bash
npm run seed
```

This creates:
- 1 test store (Fresh Mart)
- 1 admin user (admin@freshmart.com / admin123)
- 5 categories
- 20 products

### 7. Start Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## WhatsApp Setup (Meta Cloud API)

### 1. Create Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new Business App
3. Add "WhatsApp" product
4. Get a test phone number or register your own

### 2. Configure Webhook

In Meta Dashboard → WhatsApp → Configuration:

- **Callback URL:** `https://your-domain.com/api/webhook`
- **Verify Token:** (the value you set in `WHATSAPP_VERIFY_TOKEN`)
- **Webhook Fields:** Subscribe to `messages`

For local testing, use [ngrok](https://ngrok.com/):

```bash
ngrok http 3000
# Use the ngrok URL as your callback URL
```

### 3. Get Credentials

From Meta Dashboard:
- **Phone Number ID:** WhatsApp → API Setup
- **Business Account ID:** WhatsApp → API Setup
- **Access Token:** WhatsApp → API Setup → Temporary Token (get permanent token later)

## Testing the Flow

### End-to-End Test

1. Send "hi" to your WhatsApp business number
2. Bot responds with welcome message + category list
3. Select a category (e.g., "Fruits & Vegetables")
4. Bot shows products in that category
5. Select a product (e.g., "Fresh Tomatoes - ₹40")
6. Bot adds to cart and shows "Add More Items" or "Checkout" buttons
7. Click "Add More Items" to continue shopping OR "Checkout" to proceed
8. Click "Checkout" when done
9. Bot requests location - share your location pin
10. Bot asks for payment method - select "Cash on Delivery"
11. Bot confirms order with order number

### Test Commands

At any time during conversation:
- `hi` or `hello` - Reset to welcome screen
- `cart` - View current cart
- `help` - Show help message

## Conversation States

```
WELCOME → Send welcome + categories
  ↓
BROWSING_CATEGORIES → User selects category
  ↓
BROWSING_PRODUCTS → User selects product → Added to cart
  ↓
CART → User views cart → Proceeds to checkout
  ↓
CHECKOUT_LOCATION → User shares location
  ↓
CHECKOUT_PAYMENT → User selects COD or Online
  ↓
ORDER_CONFIRMED (COD) or AWAITING_PAYMENT (Online)
```

## Database Models

- **Store** - Business/shop details + WhatsApp config
- **User** - Dashboard users (admin/staff)
- **Category** - Product categories
- **Product** - Products with price, unit, stock
- **Customer** - WhatsApp customers
- **ConversationSession** - Active conversations + cart data
- **Order** - Completed orders
- **MessageLog** - All WhatsApp messages (debugging)

## API Endpoints

### Webhooks
- `GET /api/webhook` - Meta verification
- `POST /api/webhook` - Receive WhatsApp messages

### Health Check
- `GET /health` - Server status

## Development

### Run in Development Mode

```bash
npm run dev
```

Uses Node's `--watch` flag for auto-reload.

### View Database

```bash
npx prisma studio
```

Opens Prisma Studio at `http://localhost:5555`

### Check Logs

All messages are logged to console with timestamps:
- `[INFO]` - General info
- `[DEBUG]` - Detailed debug (development only)
- `[ERROR]` - Errors
- `[WARN]` - Warnings

## Next Steps (Sprint 2)

- [ ] Razorpay payment integration
- [ ] Payment webhook handling
- [ ] Template messages for order updates
- [ ] Next.js dashboard for sellers
- [ ] Product image upload (Cloudinary)
- [ ] Order status management
- [ ] Analytics and reports

## Troubleshooting

### Webhook not receiving messages

1. Check ngrok is running and URL is updated in Meta Dashboard
2. Verify `WHATSAPP_VERIFY_TOKEN` matches in .env and Meta Dashboard
3. Check webhook subscription includes "messages" field
4. Look at server logs for errors

### Database errors

1. Ensure PostgreSQL is running
2. Check `DATABASE_URL` in .env
3. Run migrations: `npx prisma migrate dev`
4. Regenerate client: `npx prisma generate`

### WhatsApp API errors

1. Check access token is valid (temporary tokens expire in 24 hours)
2. Verify phone number ID is correct
3. Check API rate limits in Meta Dashboard
4. Review error messages in server logs

## Support

For issues or questions, check:
- Meta WhatsApp Cloud API docs: https://developers.facebook.com/docs/whatsapp/cloud-api
- Prisma docs: https://www.prisma.io/docs

## License

ISC
