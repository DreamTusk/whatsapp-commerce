-- CreateTable
CREATE TABLE "StorePaymentProvider" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "keySecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorePaymentProvider_storeId_provider_key" ON "StorePaymentProvider"("storeId", "provider");

-- AddForeignKey
ALTER TABLE "StorePaymentProvider" ADD CONSTRAINT "StorePaymentProvider_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
