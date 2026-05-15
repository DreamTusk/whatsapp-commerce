# WhatsApp Catalog Setup Guide

## Step 1: Create Catalog in Meta Commerce Manager

1. Go to [Meta Commerce Manager](https://business.facebook.com/commerce)
2. Click **Catalogs** → **Create Catalog**
3. Select **E-commerce**
4. Name: `Fresh Mart Catalog`
5. Click **Create**

## Step 2: Upload Products

### Option A: Upload CSV (Quickest)

1. In your catalog, click **Add Items** → **Upload Product Info**
2. Download our template: `catalog-template.csv`
3. Upload the file
4. Map columns if needed
5. Click **Upload**

**Note:** The CSV doesn't include images. You'll need to add product images manually or use the API.

### Option B: Manual Upload (With Images)

For each product:
1. Click **Add Items** → **Add Manually**
2. Fill in:
   - **Content ID**: Use the `id` from CSV (e.g., `prod_tomatoes`)
   - **Title**: Product name
   - **Description**: Product description
   - **Price**: Price in INR
   - **Availability**: In stock
   - **Image**: Upload product image (required!)
   - **Category**: Select category
3. Click **Save**

### Option C: Use Meta Catalog API (Future automation)

We can build a sync script to automatically upload products from database to catalog.

## Step 3: Connect Catalog to WhatsApp

1. In Commerce Manager → Your Catalog
2. Click **Settings** tab
3. Click **Sales Channels** → **Add Channel** → **WhatsApp**
4. Select your WhatsApp Business Account
5. Click **Add**

## Step 4: Get Catalog ID

1. In Commerce Manager → Your Catalog
2. Look at the URL: `https://business.facebook.com/commerce/catalogs/CATALOG_ID`
3. Copy the `CATALOG_ID` (numeric ID)
4. Or click **Settings** → **Catalog Info** → **Catalog ID**

## Step 5: Update Database

Run this command with your actual catalog ID:

```bash
node update-catalog-id.js YOUR_CATALOG_ID
```

Or manually update in database:

```sql
UPDATE "Store"
SET "catalogId" = 'YOUR_CATALOG_ID'
WHERE "whatsappPhoneNumberId" = '989231900949726';
```

## Step 6: Test

1. Restart your server: `npm run dev`
2. Send "hi" to your WhatsApp number
3. You should receive a catalog message
4. Browse products natively in WhatsApp
5. Add multiple items to cart
6. Complete checkout

## Product Image Requirements

- **Format**: JPG or PNG
- **Size**: At least 500x500px (recommended: 1024x1024px)
- **Aspect ratio**: 1:1 (square)
- **File size**: Max 8MB

## Sample Product Images

You can use:
- **Unsplash**: https://unsplash.com/s/photos/groceries
- **Pexels**: https://www.pexels.com/search/grocery/
- Or take photos of actual products

## Catalog Sync (Future Feature)

We can build an admin panel feature to:
- Sync database products → WhatsApp Catalog automatically
- Upload images via API
- Update prices in real-time
- Manage stock availability

This will be part of the Next.js dashboard in Sprint 2.

## Troubleshooting

### Catalog not showing in WhatsApp
- Check catalog is connected to WhatsApp Business Account
- Verify catalogId is correct in database
- Ensure at least 1 product is active

### Products missing images
- WhatsApp requires at least one image per product
- Upload images manually in Commerce Manager
- Or use Catalog API to add images programmatically

### Catalog messages not sending
- Check your access token has `whatsapp_business_messaging` permission
- Verify catalog ID is correct
- Check catalog is approved (usually instant for test catalogs)
