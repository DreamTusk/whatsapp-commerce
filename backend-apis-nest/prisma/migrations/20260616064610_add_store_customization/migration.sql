-- CreateTable
CREATE TABLE "StoreCustomization" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#6366f1',
    "headerColor" TEXT NOT NULL DEFAULT '#1e1e2e',
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "whatsappUrl" TEXT,
    "youtubeUrl" TEXT,
    "refundPolicy" TEXT,
    "privacyPolicy" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreCustomization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreCustomization_storeId_key" ON "StoreCustomization"("storeId");

-- AddForeignKey
ALTER TABLE "StoreCustomization" ADD CONSTRAINT "StoreCustomization_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing stores with default customization
INSERT INTO "StoreCustomization" ("id", "storeId", "primaryColor", "headerColor", "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, '#6366f1', '#1e1e2e', NOW(), NOW()
FROM "Store"
WHERE id NOT IN (SELECT "storeId" FROM "StoreCustomization");
