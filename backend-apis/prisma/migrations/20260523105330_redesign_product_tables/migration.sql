-- Step 1: Clear CartItems — they reference productId which is being replaced by variantId
DELETE FROM "CartItem";

-- Step 2: Create Brand table
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create ProductVariant table
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costPrice" DOUBLE PRECISION,
    "originalPrice" DOUBLE PRECISION,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "taxPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- Step 4: Create Inventory table
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outOfStockLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- Step 5: Add new columns to Product (keep old ones for now)
ALTER TABLE "Product"
    ADD COLUMN "brandId" TEXT,
    ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Step 6: Migrate existing products → default ProductVariants
INSERT INTO "ProductVariant" (id, "productId", name, "sellingPrice", unit, "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT
    'v' || substr(md5(id::text), 1, 24),
    id,
    COALESCE(unit, 'Default'),
    price,
    unit,
    "inStock",
    0,
    NOW(),
    NOW()
FROM "Product";

-- Step 7: Now drop the old Product columns
ALTER TABLE "Product"
    DROP COLUMN "catalogProductId",
    DROP COLUMN "inStock",
    DROP COLUMN "price",
    DROP COLUMN "unit";

-- Step 8: Drop old CartItem FK and unique index, then swap productId → variantId
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_productId_fkey";
DROP INDEX "CartItem_customerId_productId_key";
ALTER TABLE "CartItem"
    DROP COLUMN "productId",
    ADD COLUMN "variantId" TEXT NOT NULL;

-- Step 9: Add variantId and variantName to OrderItem (nullable — order side is handled separately)
ALTER TABLE "OrderItem"
    ADD COLUMN "variantId" TEXT,
    ADD COLUMN "variantName" TEXT;

-- Step 10: Indexes
CREATE UNIQUE INDEX "Brand_name_storeId_key" ON "Brand"("name", "storeId");
CREATE UNIQUE INDEX "Inventory_variantId_key" ON "Inventory"("variantId");
CREATE UNIQUE INDEX "CartItem_customerId_variantId_key" ON "CartItem"("customerId", "variantId");

-- Step 11: Foreign keys
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey"
    FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
