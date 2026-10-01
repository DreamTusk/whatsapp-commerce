-- AlterTable
ALTER TABLE "CustomerOtp" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "CustomerOtp_phone_storeId_idx" ON "CustomerOtp"("phone", "storeId");
