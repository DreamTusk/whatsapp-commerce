-- Replace whatsappUrl with whatsappNumber + whatsappMessage, add xUrl
ALTER TABLE "StoreCustomization" ADD COLUMN "whatsappNumber" TEXT;
ALTER TABLE "StoreCustomization" ADD COLUMN "whatsappMessage" TEXT;
ALTER TABLE "StoreCustomization" ADD COLUMN "xUrl" TEXT;
ALTER TABLE "StoreCustomization" DROP COLUMN "whatsappUrl";
