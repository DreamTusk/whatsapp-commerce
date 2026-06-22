/*
  Warnings:

  - You are about to drop the column `whatsappAccessToken` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappBusinessAccountId` on the `Store` table. All the data in the column will be lost.
  - You are about to drop the column `whatsappPhoneNumberId` on the `Store` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsappNumberPurpose" AS ENUM ('ORDER_MANAGEMENT', 'MARKETING');

-- DropIndex
DROP INDEX "Store_whatsappPhoneNumberId_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "optedInAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Store" DROP COLUMN "whatsappAccessToken",
DROP COLUMN "whatsappBusinessAccountId",
DROP COLUMN "whatsappPhoneNumberId";

-- AlterTable
ALTER TABLE "StoreCustomization" ALTER COLUMN "headerColor" SET DEFAULT '#F4F4FE';

-- CreateTable
CREATE TABLE "StoreWhatsappNumber" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" "WhatsappNumberPurpose" NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreWhatsappNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalFailed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreWhatsappNumber_storeId_purpose_key" ON "StoreWhatsappNumber"("storeId", "purpose");

-- AddForeignKey
ALTER TABLE "StoreWhatsappNumber" ADD CONSTRAINT "StoreWhatsappNumber_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
