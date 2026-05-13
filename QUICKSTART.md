# Quick Start Guide - Sprint 1

## 5-Minute Setup

### Step 1: Environment Setup

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` and add your database URL:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_commerce
```

For WhatsApp credentials, you can use placeholder values for now:

```env
WHATSAPP_VERIFY_TOKEN=my_secret_verify_token_12345
WHATSAPP_PHONE_NUMBER_ID=placeholder_phone_id
WHATSAPP_BUSINESS_ACCOUNT_ID=placeholder_business_id
WHATSAPP_ACCESS_TOKEN=placeholder_access_token
```

### Step 2: Database Setup

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed database with test data
npm run seed
```

### Step 3: Start Server

```bash
# Start in development mode
npm run dev
```

Server starts on `http://localhost:3000`

## Testing Without WhatsApp (Local Testing)

You can test the conversation logic directly by simulating WhatsApp messages:

### 1. Check Server Health

```bash
curl http://localhost:3000/health
```

### 2. View Database

```bash
npx prisma studio
```

This opens a visual database browser at `http://localhost:5555`

You'll see:
- ✅ 1 Store (Fresh Mart)
- ✅ 5 Categories (Fruits, Dairy, Beverages, Snacks, Personal Care)
- ✅ 20 Products
- ✅ 1 Admin User

## Testing With WhatsApp

### Option 1: Use Meta Test Number (Fastest)

1. Go to [Meta for Developers](https://developers.facebook.com/apps)
2. Create new app → Business → WhatsApp
3. Use the test number provided by Meta
4. Add your personal number as a recipient
5. Copy the credentials to `.env`

### Option 2: Use ngrok for Local Webhook

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

Configure in Meta Dashboard:
- Webhook URL: `https://abc123.ngrok.io/api/webhook`
- Verify Token: (your `WHATSAPP_VERIFY_TOKEN` from .env)

### Test Conversation Flow

Send these messages to your WhatsApp business number:

1. **"hi"** → Should receive welcome message + category list
2. **Select category** → Should receive product list
3. **Select product** → Should add to cart + show action buttons
4. **"cart"** → Should show cart summary
5. **"Checkout"** → Should request location
6. **Share location** → Should ask for payment method
7. **"Cash on Delivery"** → Should confirm order

## Verify It's Working

### Check Logs

Server logs will show:

```
[INFO] 2024-04-10: WhatsApp Commerce Server running on port 3000
[INFO] 2024-04-10: Webhook verified successfully
[DEBUG] 2024-04-10: Webhook received: {...}
[INFO] 2024-04-10: New customer created: +919876543210
[DEBUG] 2024-04-10: Text message sent to +919876543210: Welcome to Fresh Mart!
```

### Check Database

In Prisma Studio (`npx prisma studio`):

1. **MessageLog** - Should see all incoming/outgoing messages
2. **Customer** - Should see new customer created
3. **ConversationSession** - Should see active session with cart data
4. **Order** - Should see completed orders

## Common Issues

### Database Connection Error

```bash
# Make sure PostgreSQL is running
sudo service postgresql start

# Or on macOS with Homebrew:
brew services start postgresql
```

### Port Already in Use

```bash
# Change port in .env
PORT=3001
```

### WhatsApp Webhook Verification Failed

- Check `WHATSAPP_VERIFY_TOKEN` matches in both .env and Meta Dashboard
- Ensure ngrok URL is correct and HTTPS
- Verify webhook URL ends with `/api/webhook`

## What's Implemented

✅ **Conversation States:**
- WELCOME → Welcome + category list
- BROWSING_CATEGORIES → Category selection
- BROWSING_PRODUCTS → Product selection + cart
- CART → Cart management
- CHECKOUT_LOCATION → Location sharing
- CHECKOUT_PAYMENT → Payment method selection
- ORDER_CONFIRMED → Order created

✅ **WhatsApp Features:**
- Text messages
- Interactive list messages (categories, products)
- Interactive button messages (actions)
- Location request
- Message logging

✅ **Backend Features:**
- State machine conversation flow
- Cart management (add, view, modify)
- Order creation
- Customer management
- Multi-language support (English + Tamil)

## Next: Sprint 2

After testing Sprint 1, we'll build:
- [ ] Razorpay payment integration
- [ ] Next.js seller dashboard
- [ ] Product image management
- [ ] Order status updates via WhatsApp
- [ ] Analytics and reports

## Need Help?

See full documentation in `README.md`
