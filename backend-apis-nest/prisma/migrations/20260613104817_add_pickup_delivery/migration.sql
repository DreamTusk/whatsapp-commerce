-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryNotes" TEXT,
ADD COLUMN     "deliveryType" TEXT NOT NULL DEFAULT 'HOME_DELIVERY',
ADD COLUMN     "expectedPickupTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "isHomeDeliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isPickupEnabled" BOOLEAN NOT NULL DEFAULT false;
